from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
import uuid
from datetime import datetime
import random


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI(title="Easy Street API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Character definitions with prices
CHARACTERS = [
    {"id": "sunny", "name": "Sunny", "icon": "sunny", "color": "#FFD54F", "price": 0},
    {"id": "leaf", "name": "Leaf", "icon": "leaf", "color": "#8BC34A", "price": 0},
    {"id": "star", "name": "Star", "icon": "star", "color": "#7CB9A8", "price": 50},
    {"id": "heart", "name": "Heart", "icon": "heart", "color": "#E8B4A2", "price": 75},
    {"id": "diamond", "name": "Diamond", "icon": "diamond", "color": "#B39DDB", "price": 100},
    {"id": "rocket", "name": "Rocket", "icon": "rocket", "color": "#64B5F6", "price": 150},
    {"id": "flash", "name": "Flash", "icon": "flash", "color": "#FFB74D", "price": 200},
    {"id": "planet", "name": "Planet", "icon": "planet", "color": "#4DB6AC", "price": 300},
    {"id": "trophy", "name": "Champion", "icon": "trophy", "color": "#FFC107", "price": 500},
    {"id": "crown", "name": "Royal", "icon": "sparkles", "color": "#9C27B0", "price": 750},
]

# Power-ups/Items
POWERUPS = [
    {"id": "double_dice", "name": "Double Dice", "description": "Roll 2 dice at once", "price": 25, "icon": "dice"},
    {"id": "lucky_roll", "name": "Lucky Roll", "description": "Guaranteed roll of 5 or 6", "price": 30, "icon": "star"},
    {"id": "shield", "name": "Money Shield", "description": "Block next money loss", "price": 20, "icon": "shield"},
    {"id": "boost", "name": "Cash Boost", "description": "Double next money gain", "price": 35, "icon": "trending-up"},
    {"id": "skip", "name": "Skip Turn", "description": "Skip an opponent's turn", "price": 40, "icon": "play-skip-forward"},
]

# AI Names pool
AI_NAMES = [
    "Alex", "Jordan", "Casey", "Morgan", "Riley", "Taylor", "Quinn", "Avery",
    "Charlie", "Dakota", "Emery", "Finley", "Harper", "Jamie", "Kendall", "Logan",
    "Marley", "Nico", "Parker", "Reese", "Sage", "Skyler", "Tatum", "Winter"
]


# Define Models
class WinsByDifficulty(BaseModel):
    easy: int = 0
    medium: int = 0
    hard: int = 0
    expert: int = 0


class PlayerProfile(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    player_name: str
    coins: int = 0  # New currency
    total_wins: int = 0
    wins_by_difficulty: WinsByDifficulty = Field(default_factory=WinsByDifficulty)
    total_games: int = 0
    best_turns: Optional[int] = None
    selected_character: str = "sunny"
    owned_characters: List[str] = Field(default_factory=lambda: ["sunny", "leaf"])
    owned_powerups: Dict[str, int] = Field(default_factory=dict)  # powerup_id: quantity
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class PlayerProfileCreate(BaseModel):
    player_name: str


class PlayerProfileUpdate(BaseModel):
    player_name: Optional[str] = None
    selected_character: Optional[str] = None
    coins: Optional[int] = None
    owned_characters: Optional[List[str]] = None
    owned_powerups: Optional[Dict[str, int]] = None


class GameState(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    player_id: str
    player_name: str = "Player"
    money: int = 50
    position: int = 0
    turn_count: int = 0
    is_completed: bool = False
    is_winner: bool = False
    final_money: Optional[int] = None
    character: str = "sunny"
    difficulty: str = "easy"
    map_type: str = "classic"
    is_solo: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class GameStateCreate(BaseModel):
    player_id: str
    player_name: str = "Player"
    character: str = "sunny"
    difficulty: str = "easy"
    map_type: str = "classic"
    is_solo: bool = True


class GameStateUpdate(BaseModel):
    money: int
    position: int
    turn_count: int
    is_completed: bool = False
    is_winner: bool = False


class PurchaseRequest(BaseModel):
    item_type: str  # "character" or "powerup"
    item_id: str


class LeaderboardEntry(BaseModel):
    player_id: str
    player_name: str
    turn_count: int
    final_money: int
    character: str
    difficulty: str
    created_at: datetime


# Health check
@api_router.get("/")
async def root():
    return {"message": "Easy Street API is running!", "version": "3.0.0"}


@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "service": "Easy Street"}


# Character and Powerup endpoints
@api_router.get("/characters")
async def get_all_characters():
    """Get all available characters"""
    return CHARACTERS


@api_router.get("/powerups")
async def get_all_powerups():
    """Get all available powerups"""
    return POWERUPS


@api_router.get("/ai-names")
async def get_random_ai_names(count: int = 3):
    """Get random AI names"""
    names = random.sample(AI_NAMES, min(count, len(AI_NAMES)))
    return names


# Player Profile Endpoints
@api_router.post("/profiles", response_model=PlayerProfile)
async def create_profile(input: PlayerProfileCreate):
    """Create a new player profile"""
    profile = PlayerProfile(player_name=input.player_name)
    await db.profiles.insert_one(profile.model_dump())
    return profile


@api_router.get("/profiles/{player_id}")
async def get_profile(player_id: str):
    """Get a player profile"""
    profile = await db.profiles.find_one({"id": player_id})
    if profile:
        return PlayerProfile(**profile)
    return None


@api_router.put("/profiles/{player_id}", response_model=PlayerProfile)
async def update_profile(player_id: str, update: PlayerProfileUpdate):
    """Update player profile"""
    update_dict = {k: v for k, v in update.model_dump().items() if v is not None}
    update_dict["updated_at"] = datetime.utcnow()
    
    result = await db.profiles.find_one_and_update(
        {"id": player_id},
        {"$set": update_dict},
        return_document=True
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    return PlayerProfile(**result)


@api_router.post("/profiles/{player_id}/purchase")
async def purchase_item(player_id: str, request: PurchaseRequest):
    """Purchase a character or powerup"""
    profile = await db.profiles.find_one({"id": player_id})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    profile = PlayerProfile(**profile)
    
    if request.item_type == "character":
        char = next((c for c in CHARACTERS if c["id"] == request.item_id), None)
        if not char:
            raise HTTPException(status_code=404, detail="Character not found")
        if request.item_id in profile.owned_characters:
            raise HTTPException(status_code=400, detail="Already owned")
        if profile.coins < char["price"]:
            raise HTTPException(status_code=400, detail="Not enough coins")
        
        new_coins = profile.coins - char["price"]
        new_owned = profile.owned_characters + [request.item_id]
        
        await db.profiles.update_one(
            {"id": player_id},
            {"$set": {"coins": new_coins, "owned_characters": new_owned, "updated_at": datetime.utcnow()}}
        )
        
        return {"success": True, "coins": new_coins, "owned_characters": new_owned}
    
    elif request.item_type == "powerup":
        powerup = next((p for p in POWERUPS if p["id"] == request.item_id), None)
        if not powerup:
            raise HTTPException(status_code=404, detail="Powerup not found")
        if profile.coins < powerup["price"]:
            raise HTTPException(status_code=400, detail="Not enough coins")
        
        new_coins = profile.coins - powerup["price"]
        owned_powerups = profile.owned_powerups.copy()
        owned_powerups[request.item_id] = owned_powerups.get(request.item_id, 0) + 1
        
        await db.profiles.update_one(
            {"id": player_id},
            {"$set": {"coins": new_coins, "owned_powerups": owned_powerups, "updated_at": datetime.utcnow()}}
        )
        
        return {"success": True, "coins": new_coins, "owned_powerups": owned_powerups}
    
    raise HTTPException(status_code=400, detail="Invalid item type")


@api_router.post("/profiles/{player_id}/use-powerup")
async def use_powerup(player_id: str, powerup_id: str):
    """Use a powerup (decrease quantity)"""
    profile = await db.profiles.find_one({"id": player_id})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    profile = PlayerProfile(**profile)
    owned_powerups = profile.owned_powerups.copy()
    
    if powerup_id not in owned_powerups or owned_powerups[powerup_id] <= 0:
        raise HTTPException(status_code=400, detail="Powerup not available")
    
    owned_powerups[powerup_id] -= 1
    if owned_powerups[powerup_id] == 0:
        del owned_powerups[powerup_id]
    
    await db.profiles.update_one(
        {"id": player_id},
        {"$set": {"owned_powerups": owned_powerups, "updated_at": datetime.utcnow()}}
    )
    
    return {"success": True, "owned_powerups": owned_powerups}


@api_router.post("/profiles/{player_id}/record-win")
async def record_win(player_id: str, turns: int, difficulty: str = "easy"):
    """Record a win and award coins"""
    profile = await db.profiles.find_one({"id": player_id})
    
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    profile = PlayerProfile(**profile)
    
    # Award coins based on difficulty
    coin_rewards = {"easy": 10, "medium": 20, "hard": 35, "expert": 50}
    coins_earned = coin_rewards.get(difficulty, 10)
    
    # Bonus for quick wins
    if turns <= 15:
        coins_earned += 10
    elif turns <= 25:
        coins_earned += 5
    
    new_coins = profile.coins + coins_earned
    new_total_wins = profile.total_wins + 1
    new_total_games = profile.total_games + 1
    
    # Update wins by difficulty
    wins_by_diff = profile.wins_by_difficulty.model_dump()
    wins_by_diff[difficulty] = wins_by_diff.get(difficulty, 0) + 1
    
    best_turns = profile.best_turns
    if best_turns is None or turns < best_turns:
        best_turns = turns
    
    await db.profiles.update_one(
        {"id": player_id},
        {"$set": {
            "coins": new_coins,
            "total_wins": new_total_wins,
            "total_games": new_total_games,
            "wins_by_difficulty": wins_by_diff,
            "best_turns": best_turns,
            "updated_at": datetime.utcnow()
        }}
    )
    
    return {
        "coins_earned": coins_earned,
        "total_coins": new_coins,
        "total_wins": new_total_wins,
        "wins_by_difficulty": wins_by_diff
    }


@api_router.post("/profiles/{player_id}/record-loss")
async def record_loss(player_id: str, difficulty: str = "easy"):
    """Record a loss (game count only)"""
    profile = await db.profiles.find_one({"id": player_id})
    
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    await db.profiles.update_one(
        {"id": player_id},
        {"$inc": {"total_games": 1}, "$set": {"updated_at": datetime.utcnow()}}
    )
    
    return {"success": True}


# Game State Endpoints
@api_router.post("/games", response_model=GameState)
async def create_game(input: GameStateCreate):
    """Create a new game for a player"""
    game = GameState(
        player_id=input.player_id,
        player_name=input.player_name,
        character=input.character,
        difficulty=input.difficulty,
        map_type=input.map_type,
        is_solo=input.is_solo
    )
    await db.games.insert_one(game.model_dump())
    return game


@api_router.get("/games/{player_id}")
async def get_current_game(player_id: str):
    """Get the current active game for a player"""
    game = await db.games.find_one(
        {"player_id": player_id, "is_completed": False},
        sort=[("created_at", -1)]
    )
    if game:
        return GameState(**game)
    return None


@api_router.put("/games/{game_id}", response_model=GameState)
async def update_game(game_id: str, update: GameStateUpdate):
    """Update game state"""
    update_dict = update.model_dump()
    update_dict["updated_at"] = datetime.utcnow()
    
    if update.is_completed:
        update_dict["final_money"] = update.money
    
    result = await db.games.find_one_and_update(
        {"id": game_id},
        {"$set": update_dict},
        return_document=True
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="Game not found")
    
    return GameState(**result)


@api_router.get("/leaderboard", response_model=List[LeaderboardEntry])
async def get_leaderboard(limit: int = 20, difficulty: Optional[str] = None):
    """Get top players by fewest turns"""
    match_query = {"is_completed": True, "is_winner": True}
    if difficulty:
        match_query["difficulty"] = difficulty
    
    pipeline = [
        {"$match": match_query},
        {"$sort": {"turn_count": 1, "final_money": -1}},
        {"$limit": limit},
        {"$project": {
            "player_id": 1,
            "player_name": 1,
            "turn_count": 1,
            "final_money": 1,
            "character": 1,
            "difficulty": 1,
            "created_at": 1
        }}
    ]
    results = await db.games.aggregate(pipeline).to_list(limit)
    return [LeaderboardEntry(**r) for r in results]


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
