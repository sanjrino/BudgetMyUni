import os
import re
import requests
from bs4 import BeautifulSoup
from datetime import datetime
from urllib.parse import quote_plus
import time

SUPABASE_URL = "https://qnesutgqisnkhpkfbclf.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuZXN1dGdxaXNua2hwa2ZiY2xmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTQyNzU4OCwiZXhwIjoyMDYxMDAzNTg4fQ.3mdOeRW2tHZnaoWnSj3hHlRbpIZeVBiqazUfFo41o-o"  # Use a secure backend key, not public anon key!

TELEGRAM_TOKEN    = "7770588503:AAHDUBPa8KJIU-F56dLwcynfg54zDZUmtZ8"
TELEGRAM_CHANNEL  = "@mojcimer_en"
LISTINGS_URL      = "https://www.mojcimer.si/seznam-prostih-sob/"

SL_MONTHS = {
    "januar": 1, "februar": 2, "marec": 3, "april": 4, "maj": 5,
    "junij": 6, "julij": 7, "avgust": 8, "september": 9,
    "oktober": 10, "november": 11, "december": 12
}

HEADERS = {
    "apikey":        SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type":  "application/json",
    "Accept":        "application/json",
}

ROOM_TYPE_MAP = {
    "soba":       "Room",
    "garsonjera": "Studio",
    "enosobno":   "1-Bedroom",
    "dvosobno":   "2-Bedroom",
    "trisobno":   "3-Bedroom",
    "štirisobno": "4-Bedroom",
}

def parse_created_at(text: str) -> datetime | None:
    m = re.search(r"(\d{1,2})\.\s*(\w+)\s*(\d{4})", text)
    if not m:
        return None
    d, mon, y = m.groups()
    month = SL_MONTHS.get(mon.lower())
    return datetime(int(y), month, int(d)) if month else None


def scrape_listings() -> list[dict]:
    resp = requests.get(LISTINGS_URL)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")
    out = []
    for a in soup.select("a.feat_property.list"):
        href = a.get("href", "")
        try:
            ext_id = int(href.rstrip("/").split("/")[-1])
        except ValueError:
            continue

        price_txt = a.select_one(".fp_price").text
        price = int(re.search(r"\d+", price_txt.replace("€", ""))[0])
        region    = a.select_one(".tag li").get_text(strip=True)
        room_type = a.select_one("h4.mb0").get_text(strip=True)
        location  = a.select_one(".address").get_text(" ", strip=True)
        info = a.select_one(".fp_meta").text.lower()
        size = int(re.search(r"(\d+)\s*m", info)[1])
        bed  = int(re.search(r"(\d+)[^\d]*bed", info + " bed")[1])
        bath = int(re.search(r"(\d+)[^\d]*shower", info + " shower")[1])
        subsidy = "subvencija" in a.text.lower()

        pdate = a.select_one(".fp_pdate")
        dt = parse_created_at(pdate.text) if pdate else None

        out.append({
            "external_id":    ext_id,
            "price":          price,
            "region":         region,
            "size":           size,
            "bed_count":      bed,
            "bathroom_count": bath,
            "subsidy":        subsidy,
            "room_type":      room_type,
            "location":       location,
            "created_at":     dt.isoformat() if dt else None,
        })
    return out

def sl_to_en_room_type(sl_room: str) -> str:
    sl_lower = sl_room.lower()
    for sl_key, en_val in ROOM_TYPE_MAP.items():
        if sl_key in sl_lower:
            return en_val
    return sl_room.title()



def make_message(listing: dict) -> str:

    eng_type = sl_to_en_room_type(listing["room_type"])
    text = (
        f"<b>{eng_type} in {listing['location']}</b>\n"
        f'<a href="https://maps.google.com/?q={quote_plus(listing["location"])}">'
        "(View location)</a>\n\n"
        f"💰 <b>Price:</b> €{listing['price']}\n"
        f"🌍 <b>Region:</b> {listing['region']}\n"
        f"📏 <b>Size:</b> {listing['size']}m²\n"
        f"🛏️ <b>Beds:</b> {listing['bed_count']}\n"
        f"🛁 <b>Bathrooms:</b> {listing['bathroom_count']}\n\n"
        f"🎓 <b>Subsidy:</b> {'Yes' if listing['subsidy'] else 'No'}\n"
        f"🏠 <b>Type:</b> {eng_type}\n\n"
        f'<a href="{LISTINGS_URL}{listing["external_id"]}">🔗 More details</a>\n\n'
    )
    return text



def send_to_telegram(text: str, details_url: str, max_retries: int = 5) -> bool:

    url = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendMessage"
    payload = {
        "chat_id": TELEGRAM_CHANNEL,
        "text": text,
        "parse_mode": "HTML",
        "disable_web_page_preview": False,
        "link_preview_options": {
            "is_disabled": False,
            "url": details_url,
            "prefer_large_media": True,
            "show_above_text": True
        }
    }

    for attempt in range(1, max_retries + 1):
        resp = requests.post(url, json=payload)
        if resp.status_code == 200:
            return True

        if resp.status_code == 429:
            data = resp.json()
            retry_after = data.get("parameters", {}).get("retry_after", 1)
            print(f"Rate limited, retrying after {retry_after}s (attempt {attempt}/{max_retries})")
            time.sleep(retry_after)
            continue


        print(f"❌ Telegram error {resp.status_code}: {resp.text}")
        return False

    print("❌ Failed to send after rate-limit retries.")
    return False

def get_user_preferences() -> list[dict]:

    url = f"{SUPABASE_URL}/rest/v1/user_preferences?select=*"
    resp = requests.get(url, headers=HEADERS)
    resp.raise_for_status()
    return resp.json()

def send_to_user(text: str, user_id: str, details_url: str, max_retries: int = 3) -> bool:

    url = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendMessage"
    payload = {
        "chat_id": int(user_id),
        "text": text,
        "parse_mode": "HTML",
        "disable_web_page_preview": False,
        "link_preview_options": {
            "is_disabled": False,
            "url": details_url,
            "prefer_large_media": True,
            "show_above_text": True
        }
    }
    for attempt in range(1, max_retries + 1):
        resp = requests.post(url, json=payload)
        if resp.status_code == 200:
            return True
        if resp.status_code == 429:
            retry_after = resp.json().get("parameters", {}).get("retry_after", 1)
            time.sleep(retry_after)
            continue
        return False
    return False

def matches_pref(listing: dict, pref: dict) -> bool:
    max_p = pref.get("max_price")
    if max_p is not None:
        # supabase returns numeric fields as strings, so cast
        if listing["price"] > float(max_p):
            return False

    region_p = pref.get("region")
    if region_p:
        if region_p.lower() not in listing["region"].lower():
            return False

    min_s = pref.get("min_size")
    if min_s is not None:
        if listing["size"] < int(min_s):
            return False

    subsidy_p = pref.get("subsidy")
    if subsidy_p is not None:
        # pref.subsidy is bool, listing["subsidy"] is bool
        if listing["subsidy"] != bool(subsidy_p):
            return False

    rt = pref.get("room_type")
    if rt:
        if rt.lower() not in listing["room_type"].lower():
            return False

    return True
def upsert_via_http(listings: list[dict]):
    if not listings:
        print("No listings to upload.")
        return []

    url = f"{SUPABASE_URL}/rest/v1/listings?on_conflict=external_id"
    headers = HEADERS.copy()
    headers["Prefer"] = "resolution=ignore-duplicates,return=representation"
    resp = requests.post(url, headers=headers, json=listings)
    resp.raise_for_status()

    if resp.status_code in (200, 201):
        inserted = resp.json()
        print(f"Inserted {len(inserted)} new rows.")

        prefs = get_user_preferences()
        print(f"Loaded {len(prefs)} user preferences")

        for listing in inserted:
            listing["location_url"] = "https://maps.google.com/?q=" + quote_plus(listing["location"])
            listing["details_url"]  = f"{LISTINGS_URL}{listing['external_id']}"
            text = make_message(listing)

            if send_to_telegram(text, listing["details_url"]):
                time.sleep(1)
            else:
                time.sleep(5)

            for pref in prefs:
                user_id = pref["user_id"]
                if matches_pref(listing, pref):
                    send_to_user(text, user_id, listing["details_url"])
                    time.sleep(0.1)  # throttle per-user sends

        return inserted

    elif resp.status_code == 204:
        print("All rows were duplicates; skipped.")
        return []

    else:
        print("Upsert → HTTP", resp.status_code, resp.text)
        return []


def get_latest_web() -> int | None:
    resp = requests.get(LISTINGS_URL)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")
    elems = soup.select("a.feat_property.list")
    if not elems:
        return None
    href = elems[0].get("href", "")
    try:
        return int(href.rstrip("/").split("/")[-1])
    except ValueError:
        return None


def exists_in_supa(ext_id: int) -> bool:
    url = f"{SUPABASE_URL}/rest/v1/listings"
    params = {
        "select":       "external_id",
        "external_id":  f"eq.{ext_id}",
        "limit":        1
    }
    resp = requests.get(url, headers=HEADERS, params=params)
    if resp.status_code != 200:
        print("Error checking supa existence:", resp.status_code, resp.text)
        return False
    return bool(resp.json())




import time

if __name__ == "__main__":
    INTERVAL_SECONDS = 15 * 60
    COUNTDOWN_STEP   = 60

    while True:
        web_ext = get_latest_web()
        print("Latest on web:", web_ext)

        if web_ext is None:
            print("Could not parse latest web listing; aborting.")
        elif exists_in_supa(web_ext):
            print("Already in database; no action needed.")
        else:
            print("New listing not found in database; scraping & uploading…")
            listings = scrape_listings()
            upsert_via_http(listings)

        remaining = INTERVAL_SECONDS
        while remaining > 0:
            mins = remaining // 60
            secs = remaining % 60
            if secs:
                print(f"Next check in {mins}min {secs}s…")
            else:
                print(f"Next check in {mins}minute(s)…")
            time.sleep(COUNTDOWN_STEP)
            remaining -= COUNTDOWN_STEP

        print("🔄 Starting next iteration now…")

