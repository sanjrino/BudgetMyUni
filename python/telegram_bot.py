import os
import telebot
import nest_asyncio
from telebot.types import InlineKeyboardMarkup, InlineKeyboardButton
from supabase import create_client, Client

nest_asyncio.apply()

TELEGRAM_TOKEN = "7770588503:AAHDUBPa8KJIU-F56dLwcynfg54zDZUmtZ8"
SUPABASE_URL = "https://qnesutgqisnkhpkfbclf.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuZXN1dGdxaXNua2hwa2ZiY2xmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTQyNzU4OCwiZXhwIjoyMDYxMDAzNTg4fQ.3mdOeRW2tHZnaoWnSj3hHlRbpIZeVBiqazUfFo41o-o"  # Use a secure backend key, not public anon key!

bot = telebot.TeleBot(TELEGRAM_TOKEN)
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

user_states = {}
FILTER_ORDER   = ['max_price','region','min_size','subsidy','room_type']
FILTER_EMOJIS  = {'max_price':'💰','region':'🌍','min_size':'📏','subsidy':'🎓','room_type':'🏠'}
FILTER_LABELS  = {'max_price':'Max. Price','region':'Region','min_size':'Min. Size','subsidy':'Subsidy','room_type':'Type'}
DEFAULTS       = {'max_price':'Any','region':'Any','min_size':'Any','subsidy':'No Preference','room_type':'Any'}
FILTER_OPTIONS = {
    'max_price': ['€100','€150','€200','€250','€300','€350','€400','€500','€600','€700','€800','Any'],
    'region': [
        'Koper','Izola','Piran','Portorož','Sečovlje','Ankaran','Nova Gorica','Solkan',
        'Ajdovščina','Vipava','Col','Črniče','Sežana','Divača','Lokev','Dutovlje',
        'Štanjel','Komen','Senožeče','Any'
    ],
    'min_size': ['10m²','20m²','30m²','40m²','50m²','Any'],
    'subsidy': ['Yes','No','No Preference'],
    'room_type': ['Room','Studio','1-Bedroom','2-Bedroom','3-Bedroom','4-Bedroom','Any']
}

ROOM_TYPE_MAP = {
    "soba":       "Room",
    "garsonjera": "Studio",
    "enosobno":   "1-Bedroom",
    "dvosobno":   "2-Bedroom",
    "trisobno":   "3-Bedroom",
    "štirisobno": "4-Bedroom",
}
REV_ROOM_TYPE_MAP = {v: k for k, v in ROOM_TYPE_MAP.items()}


def upsert_preferences(chat_id: int):
    prefs = user_states.get(chat_id, DEFAULTS.copy())
    row = {
        'user_id':   float(chat_id),
        'max_price': None if prefs['max_price']=='Any' else float(prefs['max_price'].lstrip('€')),
        'region':    None if prefs['region']=='Any' else prefs['region'],
        'min_size':  None if prefs['min_size']=='Any' else int(prefs['min_size'].rstrip('m²')),
        'subsidy':   None if prefs['subsidy']=='No Preference' else (prefs['subsidy']=='Yes'),
        'room_type': None if prefs['room_type']=='Any'
                        else REV_ROOM_TYPE_MAP[prefs['room_type']],
    }
    supabase.table("user_preferences").upsert([row], on_conflict="user_id").execute()


def show_filter_summary(chat_id, message_id=None):
    filters = user_states.get(chat_id, DEFAULTS.copy())
    summary = (
        "<b>Your Filters</b>\n\n"
        f"{FILTER_EMOJIS['max_price']} <b>Max. Price:</b> {filters['max_price']}\n"
        f"{FILTER_EMOJIS['region']} <b>Region:</b> {filters['region']}\n"
        f"{FILTER_EMOJIS['min_size']} <b>Min. Size:</b> {filters['min_size']}\n"
        f"{FILTER_EMOJIS['subsidy']} <b>Subsidy:</b> {filters['subsidy']}\n"
        f"{FILTER_EMOJIS['room_type']} <b>Type:</b> {filters['room_type']}\n\n"
        "Tap an icon to update a filter."
    )
    markup = InlineKeyboardMarkup(row_width=5)
    markup.add(*[
        InlineKeyboardButton(FILTER_EMOJIS[c], callback_data=f"edit_{c}")
        for c in FILTER_ORDER
    ])
    markup.add(InlineKeyboardButton("🔄 Reset all filters", callback_data="reset_filters"))

    if message_id:
        bot.edit_message_text(summary, chat_id, message_id, parse_mode="HTML", reply_markup=markup)
    else:
        bot.send_message(chat_id, summary, parse_mode="HTML", reply_markup=markup)


@bot.message_handler(commands=['start'])
def send_welcome(message):
    chat_id = message.chat.id
    text = (
        "👋 <b>Welcome!</b>\n\n"
        "You'll only be notified about <b>new</b> listings that match your filters.\n\n"
        "🛠️ Ready to set your filters?\n"
        "Otherwise, use /filters anytime."
    )
    markup = InlineKeyboardMarkup()
    markup.add(
        InlineKeyboardButton("✅ Set filters now", callback_data="start_filters"),
        InlineKeyboardButton("⏳ Maybe later", callback_data="maybe_later")
    )
    bot.send_message(chat_id, text, parse_mode="HTML", reply_markup=markup)

@bot.callback_query_handler(func=lambda call: call.data in ["start_filters","maybe_later"])
def handle_start_choice(call):
    chat_id    = call.message.chat.id
    message_id = call.message.message_id

    if call.data == "start_filters":
        user_states[chat_id] = {'setup_step': 0, **DEFAULTS.copy()}
        ask_next_filter_step(chat_id, message_id)
    else:
        bot.edit_message_text(
            "No problem! You can always edit later using /filters.",
            chat_id, message_id
        )

def ask_next_filter_step(chat_id, message_id):
    step = user_states[chat_id]['setup_step']
    if step >= len(FILTER_ORDER):
        bot.edit_message_text(
            "✅ That’s it — your listing filters are saved!\n\n"
            "If you'd like to view or change them at any time, just type /filters.",
            chat_id, message_id, parse_mode="HTML"
        )
        upsert_preferences(chat_id)
        return

    category = FILTER_ORDER[step]
    user_states[chat_id]['current_category'] = category

    markup   = InlineKeyboardMarkup()
    row_size = 3 if category in ['max_price','min_size','region'] else 2
    row      = []

    for i, opt in enumerate(FILTER_OPTIONS[category]):
        row.append(InlineKeyboardButton(opt, callback_data=f"setup|{category}|{opt}"))
        if len(row)==row_size or i==len(FILTER_OPTIONS[category])-1:
            markup.add(*row)
            row=[]

    prompt = f"{FILTER_EMOJIS[category]} <b>{FILTER_LABELS[category]}</b>\n\nChoose your preferred option:"
    bot.edit_message_text(prompt, chat_id, message_id, parse_mode="HTML", reply_markup=markup)

@bot.callback_query_handler(func=lambda call: call.data.startswith("setup|"))
def handle_setup_selection(call):
    chat_id = call.message.chat.id
    _, category, value = call.data.split("|", 2)
    user_states[chat_id][category] = value
    user_states[chat_id]['setup_step'] += 1
    ask_next_filter_step(chat_id, call.message.message_id)


@bot.message_handler(commands=['filters'])
def cmd_filters(msg):
    show_filter_summary(msg.chat.id)

@bot.callback_query_handler(func=lambda call: call.data.startswith("edit_"))
def handle_edit_filter(call):
    chat_id = call.message.chat.id
    category = call.data.split("_",1)[1]
    user_states.setdefault(chat_id, DEFAULTS.copy())
    user_states[chat_id]['edit_category'] = category

    markup   = InlineKeyboardMarkup()
    row_size = 3 if category in ['max_price','min_size','region'] else 2
    row      = []
    for i, opt in enumerate(FILTER_OPTIONS[category]):
        row.append(InlineKeyboardButton(opt, callback_data=f"choose|{category}|{opt}"))
        if len(row)==row_size or i==len(FILTER_OPTIONS[category])-1:
            markup.add(*row)
            row=[]

    markup.add(InlineKeyboardButton("🔙 Back", callback_data="filters_back"))
    current = user_states[chat_id].get(category,'Any')
    bot.edit_message_text(
        f"{FILTER_EMOJIS[category]} <b>{FILTER_LABELS[category]}</b>\n\n"
        f"Current: <b>{current}</b>\n\nChoose a new option:",
        chat_id, call.message.message_id,
        parse_mode="HTML", reply_markup=markup
    )

@bot.callback_query_handler(func=lambda call: call.data.startswith("choose|"))
def handle_filter_choice(call):
    chat_id = call.message.chat.id
    _, category, value = call.data.split("|", 2)
    user_states[chat_id]['pending_change'] = (category, value)

    markup = InlineKeyboardMarkup()
    markup.add(
        InlineKeyboardButton("✅ Confirm", callback_data="confirm_change"),
        InlineKeyboardButton("🔙 Back", callback_data=f"edit_{category}")
    )
    bot.edit_message_text(
        f"Are you sure you want to change\n<b>{FILTER_LABELS[category]}</b> to <b>{value}</b>?",
        chat_id, call.message.message_id,
        parse_mode="HTML", reply_markup=markup
    )

@bot.callback_query_handler(func=lambda call: call.data=="confirm_change")
def confirm_filter_change(call):
    chat_id = call.message.chat.id
    category, value = user_states[chat_id].pop('pending_change')
    user_states[chat_id][category] = value
    upsert_preferences(chat_id)

    bot.edit_message_text(
        f"✅ {FILTER_EMOJIS[category]} <b>{FILTER_LABELS[category]}</b> changed to <b>{value}</b>.",
        chat_id, call.message.message_id, parse_mode="HTML"
    )
    show_filter_summary(chat_id)

@bot.callback_query_handler(func=lambda call: call.data=="reset_filters")
def handle_reset_filters(call):
    markup = InlineKeyboardMarkup()
    markup.add(
        InlineKeyboardButton("✅ Confirm", callback_data="confirm_reset"),
        InlineKeyboardButton("🔙 Back", callback_data="filters_back")
    )
    bot.edit_message_text(
        "Are you sure you want to <b>reset all filters</b>?",
        call.message.chat.id, call.message.message_id,
        parse_mode="HTML", reply_markup=markup
    )

@bot.callback_query_handler(func=lambda call: call.data=="confirm_reset")
def confirm_reset(call):
    chat_id = call.message.chat.id
    user_states[chat_id] = DEFAULTS.copy()
    upsert_preferences(chat_id)
    bot.edit_message_text("✅ Filters have been reset.", chat_id, call.message.message_id)
    show_filter_summary(chat_id)

@bot.callback_query_handler(func=lambda call: call.data=="filters_back")
def go_back_to_filters(call):
    show_filter_summary(call.message.chat.id, call.message.message_id)


if __name__ == "__main__":
    bot.remove_webhook()
    print("Bot is running…")
    bot.infinity_polling(skip_pending=True)