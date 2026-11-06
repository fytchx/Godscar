extends RefCounted
## Native Godot data catalogue ported from web/src/sim.js (SIM_VERSION 4).
## Only the continuous-idle game is represented. The old action prototype is not used.

const CLASSES = {
	"warrior": {"name": "Warrior", "life": 130.0, "life_per": 15.0, "armor": 4.0, "armor_per": 0.7, "regen": 1.2, "crit": 0.0, "attr": {"STR": 8.0, "DEX": 3.0, "INT": 1.0}, "attr_per": {"STR": 2.0, "DEX": 0.5, "INT": 0.0}, "start_weapon": "sword", "primary": "Cleave", "primary_mult": 1.0, "hits": 1, "spell": "sunder", "specs": [
		{"name": "Berserker", "atk_spd": 20.0, "damage": 0.15, "armor_mult": -0.15},
		{"name": "Juggernaut", "life_mult": 0.25, "armor_mult": 0.25},
		{"name": "Warlord", "reflect_mult": 0.6, "regen_mult": 0.5}
	]},
	"paladin": {"name": "Paladin", "life": 120.0, "life_per": 14.0, "armor": 3.0, "armor_per": 0.6, "regen": 2.0, "crit": 0.0, "attr": {"STR": 6.0, "DEX": 2.0, "INT": 5.0}, "attr_per": {"STR": 1.5, "DEX": 0.0, "INT": 1.0}, "start_weapon": "mace", "primary": "Smite", "primary_mult": 1.0, "hits": 1, "spell": "consecrate", "specs": [
		{"name": "Templar", "armor_mult": 0.2, "all_res": 15.0, "life_mult": 0.1},
		{"name": "Inquisitor", "crit": 8.0, "crit_mult": 40.0},
		{"name": "Martyr", "life_on_hit_mult": 1.0, "life_mult": 0.15, "damage": -0.05}
	]},
	"sorcerer": {"name": "Sorcerer", "life": 100.0, "life_per": 11.0, "armor": 1.0, "armor_per": 0.25, "regen": 1.6, "crit": 0.0, "attr": {"STR": 1.0, "DEX": 3.0, "INT": 9.0}, "attr_per": {"STR": 0.0, "DEX": 0.5, "INT": 2.0}, "start_weapon": "staff", "primary": "Firebolt", "primary_mult": 1.12, "hits": 1, "spell": "ignite", "specs": [
		{"name": "Stormcaller", "atk_spd": 25.0},
		{"name": "Pyromancer", "dot_mult": 0.6},
		{"name": "Arcanist", "spell_mult": 0.35, "cdr": 15.0}
	]},
	"hunter": {"name": "Hunter", "life": 105.0, "life_per": 12.0, "armor": 2.0, "armor_per": 0.4, "regen": 1.4, "crit": 3.0, "attr": {"STR": 3.0, "DEX": 8.0, "INT": 2.0}, "attr_per": {"STR": 0.5, "DEX": 2.0, "INT": 0.0}, "start_weapon": "bow", "primary": "Quickshot", "primary_mult": 1.0, "hits": 1, "spell": "hawk", "specs": [
		{"name": "Deadeye", "crit": 10.0, "crit_mult": 30.0},
		{"name": "Beastmaster", "companion_mult": 0.8},
		{"name": "Trapper", "dot_mult": 0.4, "armor_pen": 0.3}
	]},
	"rogue": {"name": "Rogue", "life": 95.0, "life_per": 11.0, "armor": 1.5, "armor_per": 0.35, "regen": 1.3, "crit": 5.0, "attr": {"STR": 4.0, "DEX": 8.0, "INT": 1.0}, "attr_per": {"STR": 0.5, "DEX": 1.5, "INT": 0.0}, "start_weapon": "dagger", "primary": "Twin Strike", "primary_mult": 0.55, "hits": 2, "spell": "eviscerate", "specs": [
		{"name": "Assassin", "crit": 5.0, "crit_mult": 60.0},
		{"name": "Shadow", "dodge": 15.0},
		{"name": "Trickster", "atk_spd": 15.0, "life_on_hit_mult": 0.5}
	]}
}
const WEAPONS = {
	"sword": {"name": "Sword", "type": "phys", "mult": 1.0, "interval": 1.3, "hands": 1},
	"mace": {"name": "Mace", "type": "holy", "mult": 0.95, "interval": 1.35, "hands": 1},
	"dagger": {"name": "Dagger", "type": "phys", "mult": 0.62, "interval": 0.85, "hands": 1},
	"wand": {"name": "Wand", "type": "fire", "mult": 0.58, "interval": 0.8, "hands": 1},
	"rod": {"name": "Frost Rod", "type": "frost", "mult": 0.9, "interval": 1.25, "hands": 1},
	"greataxe": {"name": "Greataxe", "type": "phys", "mult": 1.8, "interval": 2.1, "hands": 2},
	"scythe": {"name": "Scythe", "type": "shadow", "mult": 1.7, "interval": 2.0, "hands": 2},
	"spear": {"name": "Storm Spear", "type": "light", "mult": 1.45, "interval": 1.7, "hands": 2},
	"staff": {"name": "Staff", "type": "fire", "mult": 1.05, "interval": 1.4, "hands": 2},
	"bow": {"name": "Bow", "type": "phys", "mult": 1.15, "interval": 1.55, "hands": 2}
}
const OFFHANDS = {"tome": {"name": "Spell Tome", "stat": "spell"}, "shield": {"name": "Shield", "stat": "reflect"}, "quiver": {"name": "Quiver", "stat": "companion"}}
const SLOTS = ["weapon", "offhand", "helm", "chest", "gloves", "belt", "legs", "boots", "ring1", "ring2", "amulet"]
const DROP_SLOTS = ["weapon", "offhand", "helm", "chest", "gloves", "belt", "legs", "boots", "ring", "amulet"]
const ARMOR_SLOTS = ["helm", "chest", "gloves", "legs", "boots"]
const DEF_BASE = {"helm": 3.0, "chest": 6.0, "gloves": 2.0, "belt": 2.0, "legs": 4.0, "boots": 2.0}
const TYPES = ["phys", "fire", "frost", "light", "shadow", "holy"]
const ELEMS = ["fire", "frost", "light", "shadow", "holy"]
const ATTRS = ["STR", "DEX", "INT"]
const RARITIES = ["common", "uncommon", "rare", "epic", "legendary", "ascended"]
const AFFIX_COUNT = {"common": [0, 0], "uncommon": [1, 2], "rare": [3, 4], "epic": [4, 5], "legendary": [6, 6], "ascended": [6, 6]}
const AFFIXES = {
	"dmgPct": {"name": "Damage %", "slots": ["weapon", "ring", "amulet"], "min": 8, "max": 20},
	"elemPct": {"name": "Elemental %", "slots": ["weapon", "ring", "amulet", "offhand", "gloves"], "min": 8, "max": 20},
	"atkSpd": {"name": "Haste %", "slots": ["weapon", "gloves", "ring", "belt"], "min": 5, "max": 12},
	"critChance": {"name": "Crit chance %", "slots": ["weapon", "helm", "ring", "amulet", "gloves"], "min": 3, "max": 7},
	"critMulti": {"name": "Crit damage %", "slots": ["weapon", "gloves", "amulet", "ring"], "min": 15, "max": 35},
	"life": {"name": "Life", "slots": ["helm", "chest", "belt", "legs", "boots", "ring", "amulet", "offhand"], "min": 10, "max": 20, "scales": true},
	"armor": {"name": "Armor", "slots": ["helm", "chest", "gloves", "belt", "legs", "boots", "offhand"], "min": 2, "max": 4, "scales": true},
	"regen": {"name": "Life/sec", "slots": ["helm", "chest", "belt", "legs", "amulet"], "min": 0.6, "max": 1.2, "scales": true},
	"lifeOnHit": {"name": "Life on hit", "slots": ["weapon", "gloves", "ring"], "min": 0.8, "max": 1.8, "scales": true},
	"reflect": {"name": "Reflect", "slots": ["helm", "chest", "legs", "boots", "amulet", "offhand"], "min": 2, "max": 4, "scales": true},
	"spellPct": {"name": "Spell %", "slots": ["weapon", "helm", "amulet", "ring", "offhand"], "min": 10, "max": 22},
	"cdr": {"name": "Cooldown reduction %", "slots": ["helm", "amulet", "belt"], "min": 3, "max": 7},
	"dodge": {"name": "Dodge %", "slots": ["boots", "legs", "gloves"], "min": 2, "max": 5},
	"goldFind": {"name": "Gold find %", "slots": ["helm", "boots", "ring", "amulet", "belt"], "min": 10, "max": 25}
}
const ENCHANTS = {"elemDmg": [18, 30], "atkSpd": [10, 16], "atkDmg": [15, 25], "doubleCast": [8, 15]}
const AUGMENTS = ["split", "searing", "heavy", "rending", "siphon", "momentum", "echo", "kindling", "bulwark", "tithe", "critcast", "strspell", "shielded", "glass", "frostbite", "conv_fire", "conv_frost", "conv_light", "conv_shadow", "conv_holy"]
const SETS = {"warden": "Wardens of Caldris", "vigil": "Ashen Vigil", "riftwalker": "Riftwalker", "hunt": "Scarbound Hunt"}
const ASC_MATS = {"helm": "graveiron", "chest": "cinderheart", "gloves": "houndsinew", "legs": "zealotash", "boots": "shadesilk"}
const PASSIVES = {"might": "Damage +2%", "vitality": "Life +3%", "swiftness": "Haste +1.5%", "precision": "Crit +0.6%, crit damage +3%", "bulwark": "Armor +3%, resist +0.5%", "sorcery": "Spell/DoT +3%"}
const ZONES = {
	"fallfields": {"name": "The Fallfields", "min_level": 1, "weights": [58.0, 30.0, 10.8, 1.1, 0.06], "ilvl": 0, "reward": 1.0, "tough": 1.0, "text": "Blighted farmland where the wound first bled into Caldris."},
	"hollow": {"name": "The Ashen Hollow", "min_level": 20, "weights": [30.0, 40.0, 25.0, 4.5, 0.35], "ilvl": 4, "reward": 1.9, "tough": 1.7, "text": "A crater of ash below the Godwound."}
}
const MONSTERS = {
	"husk": {"name": "Blighted Husk", "zone": "fallfields", "hp": 75.0, "dmg": 7.0, "interval": 2.0, "type": "phys", "armor": 0.0, "res": {}, "regen": 0.035, "blighted": true, "xp": 1.0, "gold": 1.0},
	"swarm": {"name": "Carrion Swarm", "zone": "fallfields", "hp": 30.0, "dmg": 2.4, "interval": 0.5, "type": "phys", "armor": 0.0, "res": {}, "blighted": true, "xp": 0.5, "gold": 0.5},
	"knight": {"name": "Grave Knight", "zone": "fallfields", "hp": 90.0, "dmg": 12.0, "interval": 2.0, "type": "phys", "armor": 7.0, "res": {"frost": 20.0}, "xp": 1.45, "gold": 1.5, "mat": "graveiron"},
	"wisp": {"name": "Hollow Wisp", "zone": "fallfields", "hp": 42.0, "dmg": 8.0, "interval": 1.3, "type": "fire", "armor": 0.0, "res": {"fire": 60.0, "light": -25.0}, "xp": 0.85, "gold": 0.9},
	"zealot": {"name": "Ashbound Zealot", "zone": "hollow", "hp": 85.0, "dmg": 10.0, "interval": 1.6, "type": "fire", "armor": 5.0, "res": {"fire": 30.0, "holy": 30.0}, "xp": 1.4, "gold": 1.4, "ess": ["fire", "holy"], "mat": "zealotash"},
	"hound": {"name": "Blight Hound", "zone": "hollow", "hp": 40.0, "dmg": 4.0, "interval": 0.7, "type": "phys", "armor": 0.0, "res": {"shadow": 20.0}, "regen": 0.02, "blighted": true, "xp": 0.5, "gold": 0.5, "ess": ["phys", "light"], "mat": "houndsinew"},
	"shade": {"name": "Rift Shade", "zone": "hollow", "hp": 50.0, "dmg": 9.0, "interval": 1.2, "type": "shadow", "armor": 0.0, "res": {"shadow": 50.0, "holy": -30.0}, "evade": 35.0, "xp": 1.0, "gold": 1.0, "ess": ["shadow", "frost"], "mat": "shadesilk"},
	"colossus": {"name": "Cinder Colossus", "zone": "hollow", "hp": 170.0, "dmg": 22.0, "interval": 3.0, "type": "phys", "armor": 10.0, "res": {"fire": 40.0, "frost": -20.0}, "xp": 2.6, "gold": 2.8, "ess": ["phys", "fire", "frost", "light", "shadow", "holy"], "ess_chance": 0.12, "mat": "cinderheart"}
}
const BOSSES = {
	"bellkeeper": {"name": "The Hollow Bellkeeper", "zone": "fallfields", "hp": 3000.0, "dmg": 17.0, "interval": 2.2, "type": "phys", "armor": 4.0, "res": {"shadow": 20.0}, "blighted": true, "xp": 12.0, "gold": 15.0, "min_level": 3},
	"woundwarden": {"name": "The Woundwarden", "zone": "hollow", "hp": 5100.0, "dmg": 19.0, "interval": 1.8, "type": "fire", "armor": 8.0, "res": {"fire": 35.0, "holy": 35.0}, "regen": 0.005, "evade": 10.0, "xp": 18.0, "gold": 22.0, "min_level": 20}
}
const SPELLS = {
	"sunder": {"name": "Sunder", "cd": 6.0, "mult": 2.5, "type": "phys", "penetrate": true},
	"consecrate": {"name": "Consecrate", "cd": 7.0, "mult": 1.6, "type": "holy", "heal": 0.08},
	"ignite": {"name": "Ignite", "cd": 5.0, "mult": 1.2, "type": "fire", "burn": 0.8, "burn_dur": 4.0},
	"hawk": {"name": "Hawk Talon", "cd": 9.0, "mult": 0.0, "buff": "hawk", "duration": 9.0},
	"eviscerate": {"name": "Eviscerate", "cd": 6.0, "mult": 2.2, "crit": true},
	"cinderburst": {"name": "Cinderburst", "cd": 6.0, "mult": 2.0, "type": "fire", "burn": 0.6},
	"emberrain": {"name": "Ember Rain", "cd": 10.0, "mult": 3.8, "type": "fire"},
	"frostlance": {"name": "Frost Lance", "cd": 6.0, "mult": 2.2, "type": "frost", "chill": 3},
	"chainlight": {"name": "Chain Lightning", "cd": 7.0, "mult": 0.8, "type": "light", "repeat": 3},
	"scarlance": {"name": "Scar Lance", "cd": 7.0, "mult": 2.8, "type": "phys", "penetrate": true},
	"rend": {"name": "Rend", "cd": 8.0, "mult": 0.3, "type": "phys", "bleed": 1.83, "bleed_dur": 6.0},
	"shadowbolt": {"name": "Shadow Bolt", "cd": 4.0, "mult": 1.5, "type": "shadow", "unevadable": true},
	"voidmaw": {"name": "Void Maw", "cd": 14.0, "mult": 4.2, "type": "shadow", "unevadable": true},
	"radiance": {"name": "Radiance", "cd": 8.0, "mult": 2.4, "type": "holy", "heal": 0.05},
	"barrier": {"name": "Rift Barrier", "cd": 15.0, "kind": "util", "cond": "hp50", "shield": 0.25},
	"mend": {"name": "Mend", "cd": 12.0, "kind": "util", "cond": "hp50", "heal": 0.3},
	"warcry": {"name": "War Cry", "cd": 16.0, "kind": "util", "cond": "foeHigh", "buff": "warcry", "duration": 6.0},
	"frostward": {"name": "Frost Ward", "cd": 18.0, "kind": "util", "cond": "always", "buff": "frostward", "duration": 6.0}
}
