// Локальные таблицы для обычного рандома
const localLootTables = {
random_common: [
{ name: "Ржавый Меч", rarity: "common" },
{ name: "Зелье Лечения", rarity: "rare" },
{ name: "10 Золотых", rarity: "common" },
{ name: "Старый Щит", rarity: "common" },
{ name: "Факел", rarity: "common" }
],
random_epic: [
{ name: "Клинок Ужаса", rarity: "epic" },
{ name: "Щит Дракона", rarity: "epic" },
{ name: "Амулет Бессмертия", rarity: "legendary" },
{ name: "Кольцо Защиты", rarity: "epic" }
]
}; 

const ITEM_WIDTH = 110;
const TOTAL_ITEMS = 30; 

let currentRole = "PLAYER";
let myPlayerId = ""; 

OBR.onReady(async () => {
myPlayerId = await OBR.player.getId();
currentRole = await OBR.player.getRole(); 

if (currentRole === "GM") {
document.getElementById("dmPanel").style.display = "flex";
setupGMInterface();
} else {
document.getElementById("playerPanel").style.display = "block";
}

OBR.room.onMetadataChange((metadata) => {
const lootEvent = metadata["lootbox-extension:event"];
if (lootEvent && lootEvent.timestamp !== window.lastEventTime) {
window.lastEventTime = lootEvent.timestamp;
handleLootEvent(lootEvent);
}
});

}); 

async function setupGMInterface() {
const playerSelect = document.getElementById("playerSelect");
const players = await OBR.party.getPlayers(); 

players.forEach(p => {
let opt = document.createElement("option");
opt.value = p.id;
opt.textContent = p.name;
playerSelect.appendChild(opt);
});

document.getElementById("sendLootboxBtn").addEventListener("click", async () => {
const targetPlayerId = playerSelect.value;
const lootMode = document.getElementById("lootModeSelect").value;
let winningItem = null;

// Если выбран режим D&D, Мастер заранее генерирует вещь из API и переводит её
if (lootMode.startsWith("dnd_")) {
    document.getElementById("sendLootboxBtn").textContent = "Загрузка и перевод лута...";
    document.getElementById("sendLootboxBtn").disabled = true;
    
    winningItem = await fetchFromDnDApiAndTranslate(lootMode);
    
    document.getElementById("sendLootboxBtn").textContent = "Отправить Лутбокс";
    document.getElementById("sendLootboxBtn").disabled = false;
} else {
    // Если обычный рандом, выбираем из локального массива
    const pool = localLootTables[lootMode];
    winningItem = pool[Math.floor(Math.random() * pool.length)];
}

if (!winningItem) {
    alert("Ошибка получения предмета. Попробуйте еще раз.");
    return;
}

// Отправляем событие в комнату
await OBR.room.setMetadata({
    "lootbox-extension:event": {
        targetPlayerId: targetPlayerId,
        lootMode: lootMode,
        winningItem: winningItem,
        timestamp: Date.now()
    }
});

});

} 

// Функция запроса к официальному D&D 5e API с последующим онлайн-переводом
async function fetchFromDnDApiAndTranslate(mode) {
try {
const endpoint = mode === "dnd_magic" ? "magic-items" : "equipment";
const response = await fetch(https://www.dnd5eapi.co/api/${endpoint});
const data = await response.json(); 

if (data.results && data.results.length > 0) {
    const randomIndex = Math.floor(Math.random() * data.results.length);
    const selected = data.results[randomIndex];
    const englishName = selected.name;

    // Отправляем английское название в бесплатный API переводчик MyMemory
    const translateUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(englishName)}&langpair=en|ru`;
    const translateResponse = await fetch(translateUrl);
    const translateData = await translateResponse.json();
    
    let russianName = englishName; // Запасной вариант, если перевод сбойнет
    if (translateData && translateData.responseData && translateData.responseData.translatedText) {
        russianName = translateData.responseData.translatedText;
    }
    
    return {
        name: russianName,
        rarity: "dnd5e"
    };
}

} catch (e) {
console.error("Ошибка при работе с D&D API или Переводчиком:", e);
}
return { name: "Дубина (Ошибка API)", rarity: "common" };

} 

function handleLootEvent(event) {
if (event.targetPlayerId === myPlayerId && currentRole !== "GM") {
startLootboxAnimation(event.lootMode, event.winningItem);
}
} 

function startLootboxAnimation(lootMode, winningItem) {
const track = document.getElementById("rouletteTrack");
const wrapper = document.getElementById("rouletteWrapper");
const status = document.getElementById("statusMessage"); 

status.textContent = "Вам прилетел сундук! Открытие...";
wrapper.style.display = "block";
track.innerHTML = "";
track.style.transition = "none";
track.style.transform = "translateX(0px)";

let generatedItems = [];
const fillerPool = localLootTables["random_common"].concat(localLootTables["random_epic"]);

for (let i = 0; i < TOTAL_ITEMS; i++) {
const randomItem = fillerPool[Math.floor(Math.random() * fillerPool.length)];
generatedItems.push(randomItem);
const itemDiv = document.createElement("div");
itemDiv.className = `roulette-item rarity-${randomItem.rarity}`;
itemDiv.innerHTML = `<span>${randomItem.name}