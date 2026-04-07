import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Modal,
  ScrollView,
  TextInput,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

// Colors
const COLORS = {
  background: '#F5F0E8',
  boardBg: '#E8E2D6',
  primary: '#7CB9A8',
  primaryDark: '#5A9A8A',
  accent: '#E8B4A2',
  accentDark: '#D49A86',
  text: '#4A4A4A',
  textLight: '#7A7A7A',
  positive: '#8BC34A',
  negative: '#E8A87C',
  white: '#FFFFFF',
  shadow: '#00000020',
  gold: '#FFD54F',
  purple: '#B39DDB',
  blue: '#64B5F6',
  pink: '#F48FB1',
  teal: '#4DB6AC',
  orange: '#FFB74D',
  red: '#EF9A9A',
  disabled: '#C5C5C5',
  party: '#FF6B6B',
};

// Board space types
interface BoardSpace {
  id: number;
  type: string;
  name: string;
  icon: string;
  color: string;
  minAmount?: number;
  maxAmount?: number;
  isDetour?: boolean;
}

// Map layouts with detour path
const createMapLayout = (name: string, decoration: string, spaces: BoardSpace[]): { name: string; decoration: string; detourStart: number; detourSpaces: BoardSpace[]; spaces: BoardSpace[] } => ({
  name,
  decoration,
  detourStart: 12, // Fork is at position 12
  detourSpaces: [
    { id: 100, type: 'bonus', name: 'Secret Path', icon: 'key', color: COLORS.purple, minAmount: 25, maxAmount: 40, isDetour: true },
    { id: 101, type: 'lucky', name: 'Hidden Gem', icon: 'diamond', color: COLORS.gold, minAmount: 20, maxAmount: 35, isDetour: true },
    { id: 102, type: 'mystery', name: 'Dark Corner', icon: 'moon', color: COLORS.purple, minAmount: -10, maxAmount: 50, isDetour: true },
  ],
  spaces,
});

const MAP_LAYOUTS: Record<string, ReturnType<typeof createMapLayout>> = {
  classic: createMapLayout('Classic Park', 'trees', [
    { id: 0, type: 'start', name: 'Home', icon: 'home', color: COLORS.primary },
    { id: 1, type: 'bonus', name: 'Found Coins', icon: 'cash', color: COLORS.positive, minAmount: 15, maxAmount: 25 },
    { id: 2, type: 'rest', name: 'Garden', icon: 'leaf', color: COLORS.purple },
    { id: 3, type: 'party', name: 'Party Time!', icon: 'game-controller', color: COLORS.party },
    { id: 4, type: 'expense', name: 'Coffee', icon: 'cafe', color: COLORS.accent, minAmount: 5, maxAmount: 12 },
    { id: 5, type: 'gift', name: 'Gift', icon: 'gift', color: COLORS.accentDark, minAmount: 20, maxAmount: 30 },
    { id: 6, type: 'toll', name: 'Toll', icon: 'car', color: COLORS.red, minAmount: 8, maxAmount: 15 },
    { id: 7, type: 'mystery', name: 'Mystery', icon: 'help-circle', color: COLORS.purple, minAmount: -15, maxAmount: 35 },
    { id: 8, type: 'bonus', name: 'Music', icon: 'musical-notes', color: COLORS.positive, minAmount: 12, maxAmount: 22 },
    { id: 9, type: 'tax', name: 'Tax', icon: 'document-text', color: COLORS.orange, minAmount: 10, maxAmount: 18 },
    { id: 10, type: 'rest', name: 'Meadow', icon: 'sunny', color: COLORS.gold },
    { id: 11, type: 'prize', name: 'Prize!', icon: 'trophy', color: COLORS.gold, minAmount: 30, maxAmount: 45 },
    { id: 12, type: 'fork', name: 'Crossroads', icon: 'git-branch', color: COLORS.blue },
    { id: 13, type: 'lucky', name: 'Wishing Well', icon: 'water', color: COLORS.blue, minAmount: 15, maxAmount: 28 },
    { id: 14, type: 'party', name: 'Game Zone!', icon: 'game-controller', color: COLORS.party },
    { id: 15, type: 'gift', name: 'Birthday', icon: 'mail', color: COLORS.pink, minAmount: 18, maxAmount: 28 },
    { id: 16, type: 'toll', name: 'Parking', icon: 'bus', color: COLORS.red, minAmount: 6, maxAmount: 12 },
    { id: 17, type: 'mystery', name: 'Surprise', icon: 'sparkles', color: COLORS.purple, minAmount: -20, maxAmount: 40 },
    { id: 18, type: 'bonus', name: 'Yard Sale', icon: 'pricetag', color: COLORS.positive, minAmount: 10, maxAmount: 18 },
    { id: 19, type: 'rest', name: 'Beach', icon: 'umbrella', color: COLORS.teal },
    { id: 20, type: 'tax', name: 'Bills', icon: 'flash', color: COLORS.orange, minAmount: 8, maxAmount: 15 },
    { id: 21, type: 'jackpot', name: 'JACKPOT', icon: 'diamond', color: COLORS.gold, minAmount: 50, maxAmount: 75 },
    { id: 22, type: 'shopping', name: 'Snacks', icon: 'pizza', color: COLORS.pink, minAmount: 5, maxAmount: 10 },
    { id: 23, type: 'lucky', name: 'Rainbow', icon: 'color-palette', color: COLORS.purple, minAmount: 20, maxAmount: 35 },
  ]),
  beach: createMapLayout('Sunny Beach', 'waves', [
    { id: 0, type: 'start', name: 'Beach House', icon: 'home', color: COLORS.teal },
    { id: 1, type: 'bonus', name: 'Shell Find', icon: 'diamond', color: COLORS.positive, minAmount: 18, maxAmount: 28 },
    { id: 2, type: 'expense', name: 'Ice Cream', icon: 'ice-cream', color: COLORS.pink, minAmount: 5, maxAmount: 10 },
    { id: 3, type: 'party', name: 'Beach Party!', icon: 'game-controller', color: COLORS.party },
    { id: 4, type: 'rest', name: 'Hammock', icon: 'bed', color: COLORS.purple },
    { id: 5, type: 'toll', name: 'Boat Ride', icon: 'boat', color: COLORS.blue, minAmount: 10, maxAmount: 18 },
    { id: 6, type: 'gift', name: 'Souvenir', icon: 'gift', color: COLORS.accentDark, minAmount: 15, maxAmount: 25 },
    { id: 7, type: 'mystery', name: 'Wave', icon: 'water', color: COLORS.blue, minAmount: -18, maxAmount: 38 },
    { id: 8, type: 'bonus', name: 'Tips', icon: 'cash', color: COLORS.positive, minAmount: 12, maxAmount: 20 },
    { id: 9, type: 'expense', name: 'Sunscreen', icon: 'sunny', color: COLORS.orange, minAmount: 6, maxAmount: 12 },
    { id: 10, type: 'prize', name: 'Surf Win!', icon: 'trophy', color: COLORS.gold, minAmount: 35, maxAmount: 50 },
    { id: 11, type: 'party', name: 'Luau!', icon: 'game-controller', color: COLORS.party },
    { id: 12, type: 'fork', name: 'Split Path', icon: 'git-branch', color: COLORS.blue },
    { id: 13, type: 'lucky', name: 'Sunset', icon: 'sunny', color: COLORS.orange, minAmount: 12, maxAmount: 22 },
    { id: 14, type: 'tax', name: 'Umbrella', icon: 'umbrella', color: COLORS.accent, minAmount: 8, maxAmount: 14 },
    { id: 15, type: 'rest', name: 'Tide Pool', icon: 'fish', color: COLORS.teal },
    { id: 16, type: 'toll', name: 'Parking', icon: 'car', color: COLORS.red, minAmount: 8, maxAmount: 15 },
    { id: 17, type: 'gift', name: 'Pearl', icon: 'sparkles', color: COLORS.purple, minAmount: 20, maxAmount: 32 },
    { id: 18, type: 'mystery', name: 'Bottle', icon: 'help-circle', color: COLORS.purple, minAmount: -15, maxAmount: 45 },
    { id: 19, type: 'bonus', name: 'Dive Find', icon: 'eye', color: COLORS.positive, minAmount: 15, maxAmount: 25 },
    { id: 20, type: 'expense', name: 'Dinner', icon: 'restaurant', color: COLORS.accent, minAmount: 12, maxAmount: 20 },
    { id: 21, type: 'jackpot', name: 'TREASURE', icon: 'diamond', color: COLORS.gold, minAmount: 55, maxAmount: 80 },
    { id: 22, type: 'tax', name: 'Rental', icon: 'bicycle', color: COLORS.orange, minAmount: 6, maxAmount: 12 },
    { id: 23, type: 'lucky', name: 'Dolphins', icon: 'heart', color: COLORS.blue, minAmount: 18, maxAmount: 32 },
  ]),
  city: createMapLayout('Downtown', 'buildings', [
    { id: 0, type: 'start', name: 'Apartment', icon: 'home', color: COLORS.primary },
    { id: 1, type: 'bonus', name: 'Tip Jar', icon: 'cash', color: COLORS.positive, minAmount: 12, maxAmount: 22 },
    { id: 2, type: 'toll', name: 'Metro', icon: 'subway', color: COLORS.blue, minAmount: 5, maxAmount: 10 },
    { id: 3, type: 'party', name: 'Club Night!', icon: 'game-controller', color: COLORS.party },
    { id: 4, type: 'expense', name: 'Coffee Shop', icon: 'cafe', color: COLORS.accent, minAmount: 8, maxAmount: 15 },
    { id: 5, type: 'rest', name: 'Park Bench', icon: 'leaf', color: COLORS.teal },
    { id: 6, type: 'gift', name: 'Package', icon: 'cube', color: COLORS.accentDark, minAmount: 18, maxAmount: 28 },
    { id: 7, type: 'mystery', name: 'Alley', icon: 'help-circle', color: COLORS.purple, minAmount: -20, maxAmount: 35 },
    { id: 8, type: 'tax', name: 'Rent', icon: 'business', color: COLORS.red, minAmount: 15, maxAmount: 25 },
    { id: 9, type: 'bonus', name: 'Busking', icon: 'musical-notes', color: COLORS.positive, minAmount: 10, maxAmount: 18 },
    { id: 10, type: 'prize', name: 'Jackpot!', icon: 'trophy', color: COLORS.gold, minAmount: 35, maxAmount: 50 },
    { id: 11, type: 'party', name: 'Arcade!', icon: 'game-controller', color: COLORS.party },
    { id: 12, type: 'fork', name: 'Junction', icon: 'git-branch', color: COLORS.blue },
    { id: 13, type: 'lucky', name: 'Find $20', icon: 'wallet', color: COLORS.positive, minAmount: 15, maxAmount: 25 },
    { id: 14, type: 'expense', name: 'Taxi', icon: 'car', color: COLORS.accent, minAmount: 10, maxAmount: 18 },
    { id: 15, type: 'rest', name: 'Rooftop', icon: 'sunny', color: COLORS.orange },
    { id: 16, type: 'toll', name: 'Parking', icon: 'car', color: COLORS.red, minAmount: 8, maxAmount: 15 },
    { id: 17, type: 'gift', name: 'Bonus', icon: 'gift', color: COLORS.pink, minAmount: 20, maxAmount: 30 },
    { id: 18, type: 'mystery', name: 'Event', icon: 'sparkles', color: COLORS.purple, minAmount: -18, maxAmount: 42 },
    { id: 19, type: 'bonus', name: 'Refund', icon: 'card', color: COLORS.positive, minAmount: 12, maxAmount: 20 },
    { id: 20, type: 'expense', name: 'Gym', icon: 'fitness', color: COLORS.accent, minAmount: 8, maxAmount: 14 },
    { id: 21, type: 'jackpot', name: 'PROMOTION', icon: 'diamond', color: COLORS.gold, minAmount: 60, maxAmount: 85 },
    { id: 22, type: 'rest', name: 'Cafe', icon: 'cafe', color: COLORS.teal },
    { id: 23, type: 'lucky', name: 'Charity', icon: 'heart', color: COLORS.pink, minAmount: 15, maxAmount: 28 },
  ]),
};

const STARTING_MONEY = 50;
const GOAL_MONEY = 200;
const BOARD_SIZE = 420;
const BOARD_CENTER = 210;
const MAIN_RADIUS = 155;
const DETOUR_RECONNECT_OFFSET = 4;

// Character definitions
interface Character {
  id: string;
  name: string;
  icon: string;
  color: string;
  price: number;
}

const CHARACTERS: Character[] = [
  { id: 'sunny', name: 'Sunny', icon: 'sunny', color: '#FFD54F', price: 0 },
  { id: 'leaf', name: 'Leaf', icon: 'leaf', color: '#8BC34A', price: 0 },
  { id: 'star', name: 'Star', icon: 'star', color: '#7CB9A8', price: 50 },
  { id: 'heart', name: 'Heart', icon: 'heart', color: '#E8B4A2', price: 75 },
  { id: 'diamond', name: 'Diamond', icon: 'diamond', color: '#B39DDB', price: 100 },
  { id: 'rocket', name: 'Rocket', icon: 'rocket', color: '#64B5F6', price: 150 },
  { id: 'flash', name: 'Flash', icon: 'flash', color: '#FFB74D', price: 200 },
  { id: 'planet', name: 'Planet', icon: 'planet', color: '#4DB6AC', price: 300 },
  { id: 'trophy', name: 'Champion', icon: 'trophy', color: '#FFC107', price: 500 },
  { id: 'crown', name: 'Royal', icon: 'sparkles', color: '#9C27B0', price: 750 },
];

// In-game powerups
interface Powerup {
  id: string;
  name: string;
  description: string;
  cost: number;
  icon: string;
}

const POWERUPS: Powerup[] = [
  { id: 'double_dice', name: 'Double Dice', description: 'Roll 2 dice', cost: 15, icon: 'dice' },
  { id: 'lucky_roll', name: 'Lucky Roll', description: 'Roll 5 or 6', cost: 20, icon: 'star' },
  { id: 'shield', name: 'Shield', description: 'Block loss', cost: 12, icon: 'shield' },
  { id: 'boost', name: 'Boost', description: 'Double gain', cost: 18, icon: 'trending-up' },
];

// Minigame types
type MinigameType = 'button_mash' | 'reaction' | 'memory' | 'timing';

interface Minigame {
  type: MinigameType;
  name: string;
  description: string;
  reward: number;
}

const MINIGAMES: Minigame[] = [
  { type: 'button_mash', name: 'Speed Tap!', description: 'Tap the button as fast as you can!\nFirst to fill the bar wins!', reward: 30 },
  { type: 'reaction', name: 'Quick Draw!', description: 'Wait for the light to turn GREEN...\nThen tap as fast as you can!', reward: 25 },
  { type: 'timing', name: 'Perfect Stop!', description: 'A bar fills up automatically.\nTap to stop it as close to the target as possible!', reward: 35 },
];

// AI Names
const AI_NAMES = ['Alex', 'Jordan', 'Casey', 'Morgan', 'Riley', 'Taylor', 'Quinn', 'Avery', 'Charlie', 'Dakota', 'Emery', 'Finley', 'Harper', 'Jamie', 'Kendall', 'Logan'];

interface Player {
  id: string;
  name: string;
  isAI: boolean;
  character: Character;
  money: number;
  position: number;
  onDetour: boolean;
  detourPosition: number;
  fakeWins?: number;
}

const getRandomAmount = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

// AI earning multiplier based on difficulty
const AI_EARNING_MULTIPLIER: Record<string, number> = {
  easy: 0.6,
  medium: 0.8,
  hard: 1.0,
  expert: 1.2,
};

export default function EasyStreet() {
  // Player data
  const [playerId, setPlayerId] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [coins, setCoins] = useState(0);
  const [totalWins, setTotalWins] = useState(0);
  const [winsByDifficulty, setWinsByDifficulty] = useState({ easy: 0, medium: 0, hard: 0, expert: 0 });
  const [selectedCharacter, setSelectedCharacter] = useState<Character>(CHARACTERS[0]);
  const [ownedCharacters, setOwnedCharacters] = useState<string[]>(['sunny', 'leaf']);

  // Game options
  const [isSolo, setIsSolo] = useState(true);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | 'expert'>('easy');
  const [mapType, setMapType] = useState<'classic' | 'beach' | 'city'>('classic');
  const [aiCount, setAiCount] = useState(1);

  // Game state
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [diceValue, setDiceValue] = useState(1);
  const [diceValue2, setDiceValue2] = useState(0);
  const [isRolling, setIsRolling] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [turnCount, setTurnCount] = useState(0);
  const [showEvent, setShowEvent] = useState(false);
  const [eventText, setEventText] = useState('');
  const [eventAmount, setEventAmount] = useState(0);
  const [activePowerup, setActivePowerup] = useState<string | null>(null);
  const [hasShield, setHasShield] = useState(false);
  const [hasBoost, setHasBoost] = useState(false);
  const [showForkChoice, setShowForkChoice] = useState(false);
  const [forkPlayerIdx, setForkPlayerIdx] = useState(0);

  // Minigame state
  const [showMinigame, setShowMinigame] = useState(false);
  const [currentMinigame, setCurrentMinigame] = useState<Minigame | null>(null);
  const [showMinigameTutorial, setShowMinigameTutorial] = useState(false);
  const [minigameActive, setMinigameActive] = useState(false);
  const [playerProgress, setPlayerProgress] = useState(0);
  const [aiProgress, setAiProgress] = useState(0);
  const [minigameWinner, setMinigameWinner] = useState<'player' | 'ai' | null>(null);
  const [reactionState, setReactionState] = useState<'wait' | 'ready' | 'go' | 'done'>('wait');
  const [timingBarPos, setTimingBarPos] = useState(0);
  const [timingTarget] = useState(75);
  const [timingStopped, setTimingStopped] = useState(false);
  const [aiTimingScore, setAiTimingScore] = useState(0);
  const reactionStartTime = useRef(0);
  const playerReactionTime = useRef(0);
  const aiReactionTime = useRef(0);

  // UI state
  const [currentScreen, setCurrentScreen] = useState<'welcome' | 'options' | 'loading' | 'game' | 'win' | 'loss' | 'leaderboard' | 'characters' | 'shop' | 'wins'>('welcome');
  const [showPowerupModal, setShowPowerupModal] = useState(false);
  const [showPlayerInfo, setShowPlayerInfo] = useState<Player | null>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadedPlayers, setLoadedPlayers] = useState<Player[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Screen effects
  const screenFlash = useSharedValue(0);
  const screenShake = useSharedValue(0);
  const flashColor = useRef<'positive' | 'negative'>('positive');

  // Camera state
  const cameraScale = useSharedValue(1.5);
  const cameraX = useSharedValue(0);
  const cameraY = useSharedValue(0);

  // Animation values
  const diceRotation = useSharedValue(0);
  const diceScale = useSharedValue(1);

  // Get current map
  const currentMap = MAP_LAYOUTS[mapType] || MAP_LAYOUTS.classic;
  const currentSpaces = currentMap.spaces;
  const TOTAL_SPACES = currentSpaces.length;
  const FORK_INDEX = currentMap.detourStart;

  // Helper: get x,y coords for detour spaces (arc outside the main circle)
  const getDetourSpaceCoords = (detourIndex: number) => {
    const forkAngle = (FORK_INDEX / TOTAL_SPACES) * 2 * Math.PI - Math.PI / 2;
    const reconnectIdx = (FORK_INDEX + DETOUR_RECONNECT_OFFSET) % TOTAL_SPACES;
    const reconnectAngle = (reconnectIdx / TOTAL_SPACES) * 2 * Math.PI - Math.PI / 2;

    const numDetourSpaces = currentMap.detourSpaces.length;
    const t = (detourIndex + 1) / (numDetourSpaces + 1);

    let angleDiff = reconnectAngle - forkAngle;
    if (angleDiff < 0) angleDiff += 2 * Math.PI;

    const angle = forkAngle + angleDiff * t;
    const outwardBulge = 30 * Math.sin(t * Math.PI);
    const radius = MAIN_RADIUS + 18 + outwardBulge;

    return {
      x: BOARD_CENTER + radius * Math.cos(angle),
      y: BOARD_CENTER + radius * Math.sin(angle),
    };
  };

  // Initialize
  useEffect(() => {
    loadLocalData();
  }, []);

  const loadLocalData = async () => {
    try {
      const savedPlayerId = await AsyncStorage.getItem('easystreet_player_id');
      const savedPlayerName = await AsyncStorage.getItem('easystreet_player_name');
      const savedCharacter = await AsyncStorage.getItem('easystreet_character');
      const savedCoins = await AsyncStorage.getItem('easystreet_coins');
      const savedWins = await AsyncStorage.getItem('easystreet_wins');
      const savedWinsByDiff = await AsyncStorage.getItem('easystreet_wins_by_diff');
      const savedOwned = await AsyncStorage.getItem('easystreet_owned_chars');

      if (savedPlayerId) setPlayerId(savedPlayerId);
      if (savedPlayerName) setPlayerName(savedPlayerName);
      if (savedCoins) setCoins(parseInt(savedCoins));
      if (savedWins) setTotalWins(parseInt(savedWins));
      if (savedWinsByDiff) setWinsByDifficulty(JSON.parse(savedWinsByDiff));
      if (savedOwned) setOwnedCharacters(JSON.parse(savedOwned));
      if (savedCharacter) {
        const char = CHARACTERS.find(c => c.id === savedCharacter);
        if (char) setSelectedCharacter(char);
      }
    } catch (error) {
      console.log('Error loading data:', error);
    }
  };

  const saveLocalData = async () => {
    try {
      await AsyncStorage.setItem('easystreet_player_id', playerId);
      await AsyncStorage.setItem('easystreet_player_name', playerName);
      await AsyncStorage.setItem('easystreet_character', selectedCharacter.id);
      await AsyncStorage.setItem('easystreet_coins', coins.toString());
      await AsyncStorage.setItem('easystreet_wins', totalWins.toString());
      await AsyncStorage.setItem('easystreet_wins_by_diff', JSON.stringify(winsByDifficulty));
      await AsyncStorage.setItem('easystreet_owned_chars', JSON.stringify(ownedCharacters));
    } catch (error) {
      console.log('Error saving data:', error);
    }
  };

  useEffect(() => {
    if (playerId) saveLocalData();
  }, [coins, totalWins, winsByDifficulty, ownedCharacters, selectedCharacter]);

  const generateAIPlayers = (count: number): Player[] => {
    const aiPlayers: Player[] = [];
    const usedNames: string[] = [];
    const availableChars = CHARACTERS.filter(c => c.id !== selectedCharacter.id);

    for (let i = 0; i < count; i++) {
      let name = AI_NAMES[Math.floor(Math.random() * AI_NAMES.length)];
      while (usedNames.includes(name)) {
        name = AI_NAMES[Math.floor(Math.random() * AI_NAMES.length)];
      }
      usedNames.push(name);

      const char = availableChars[i % availableChars.length];
      const fakeWins = Math.floor(Math.random() * 50) + (difficulty === 'expert' ? 20 : difficulty === 'hard' ? 10 : 5);

      aiPlayers.push({
        id: `ai_${i}`,
        name,
        isAI: true,
        character: char,
        money: STARTING_MONEY,
        position: 0,
        onDetour: false,
        detourPosition: 0,
        fakeWins,
      });
    }
    return aiPlayers;
  };

  const startLoadingScreen = () => {
    let pid = playerId;
    if (!pid) {
      pid = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setPlayerId(pid);
    }

    const humanPlayer: Player = {
      id: pid,
      name: playerName || 'Player',
      isAI: false,
      character: selectedCharacter,
      money: STARTING_MONEY,
      position: 0,
      onDetour: false,
      detourPosition: 0,
    };

    setLoadedPlayers([humanPlayer]);
    setLoadingProgress(1);
    setCurrentScreen('loading');

    if (isSolo) {
      setTimeout(() => {
        setPlayers([humanPlayer]);
        setCurrentPlayerIndex(0);
        setTurnCount(0);
        setHasShield(false);
        setHasBoost(false);
        setActivePowerup(null);
        setCurrentScreen('game');
        updateCameraForPlayer(0, [humanPlayer]);
      }, 1500);
    } else {
      const aiPlayers = generateAIPlayers(aiCount);
      let loaded = 1;

      const loadNext = () => {
        if (loaded <= aiCount) {
          setTimeout(() => {
            setLoadedPlayers([humanPlayer, ...aiPlayers.slice(0, loaded)]);
            setLoadingProgress(loaded + 1);
            loaded++;
            loadNext();
          }, 800 + Math.random() * 600);
        } else {
          setTimeout(() => {
            const allPlayers = [humanPlayer, ...aiPlayers];
            setPlayers(allPlayers);
            setCurrentPlayerIndex(0);
            setTurnCount(0);
            setHasShield(false);
            setHasBoost(false);
            setActivePowerup(null);
            setCurrentScreen('game');
            updateCameraForPlayer(0, allPlayers);
          }, 500);
        }
      };
      loadNext();
    }
  };

  const updateCameraForPlayer = (playerIdx: number, playerList: Player[]) => {
    const player = playerList[playerIdx];
    if (!player) return;

    let offsetX: number, offsetY: number;

    if (player.onDetour) {
      const coords = getDetourSpaceCoords(player.detourPosition);
      offsetX = coords.x - BOARD_CENTER;
      offsetY = coords.y - BOARD_CENTER;
    } else {
      const angle = (player.position / TOTAL_SPACES) * 2 * Math.PI - Math.PI / 2;
      offsetX = MAIN_RADIUS * Math.cos(angle);
      offsetY = MAIN_RADIUS * Math.sin(angle);
    }

    cameraX.value = withTiming(-offsetX * 0.35, { duration: 600, easing: Easing.out(Easing.cubic) });
    cameraY.value = withTiming(-offsetY * 0.35, { duration: 600, easing: Easing.out(Easing.cubic) });
    cameraScale.value = withTiming(1.5, { duration: 600, easing: Easing.out(Easing.cubic) });
  };

  const zoomOutCamera = () => {
    cameraX.value = withTiming(0, { duration: 500, easing: Easing.out(Easing.cubic) });
    cameraY.value = withTiming(0, { duration: 500, easing: Easing.out(Easing.cubic) });
    cameraScale.value = withTiming(0.85, { duration: 500, easing: Easing.out(Easing.cubic) });
  };

  const triggerScreenEffect = (isPositive: boolean) => {
    flashColor.current = isPositive ? 'positive' : 'negative';
    
    if (!isPositive) {
      screenShake.value = withSequence(
        withTiming(10, { duration: 50 }),
        withTiming(-10, { duration: 50 }),
        withTiming(8, { duration: 50 }),
        withTiming(-8, { duration: 50 }),
        withTiming(0, { duration: 50 })
      );
    }

    screenFlash.value = withSequence(
      withTiming(0.4, { duration: 150 }),
      withTiming(0, { duration: 400 })
    );
  };

  const handleSpaceEvent = (player: Player, space: BoardSpace, isHuman: boolean): number => {
    let amountChange = 0;
    const aiMultiplier = !isHuman ? AI_EARNING_MULTIPLIER[difficulty] : 1;

    switch (space.type) {
      case 'start':
      case 'rest':
      case 'fork':
      case 'party':
        break;
      case 'bonus':
      case 'lucky':
      case 'gift':
      case 'prize':
      case 'jackpot':
        amountChange = getRandomAmount(space.minAmount || 10, space.maxAmount || 20);
        if (!isHuman) {
          amountChange = Math.round(amountChange * aiMultiplier);
        }
        if (isHuman && hasBoost) {
          amountChange *= 2;
          setHasBoost(false);
        }
        break;
      case 'expense':
      case 'tax':
      case 'toll':
      case 'shopping':
        amountChange = -getRandomAmount(space.minAmount || 5, space.maxAmount || 10);
        if (isHuman && hasShield) {
          amountChange = 0;
          setHasShield(false);
        }
        break;
      case 'mystery':
        amountChange = getRandomAmount(space.minAmount || -15, space.maxAmount || 35);
        if (amountChange > 0 && !isHuman) {
          amountChange = Math.round(amountChange * aiMultiplier);
        }
        if (amountChange > 0 && isHuman && hasBoost) {
          amountChange *= 2;
          setHasBoost(false);
        } else if (amountChange < 0 && isHuman && hasShield) {
          amountChange = 0;
          setHasShield(false);
        }
        break;
    }

    return amountChange;
  };

  // Minigame functions
  const startMinigame = (playerIdx: number, playerList: Player[]) => {
    const game = MINIGAMES[Math.floor(Math.random() * MINIGAMES.length)];
    setCurrentMinigame(game);
    setShowMinigameTutorial(true);
    setShowMinigame(true);
    setPlayerProgress(0);
    setAiProgress(0);
    setMinigameWinner(null);
    setReactionState('wait');
    setTimingBarPos(0);
    setTimingStopped(false);
    setForkPlayerIdx(playerIdx);
  };

  const beginMinigame = () => {
    setShowMinigameTutorial(false);
    setMinigameActive(true);

    if (currentMinigame?.type === 'button_mash') {
      // AI will tap at varying speeds based on difficulty
      const aiSpeed = difficulty === 'easy' ? 150 : difficulty === 'medium' ? 100 : difficulty === 'hard' ? 70 : 50;
      const aiInterval = setInterval(() => {
        setAiProgress(p => {
          if (p >= 100) {
            clearInterval(aiInterval);
            return 100;
          }
          return p + (3 + Math.random() * 2);
        });
      }, aiSpeed);
    } else if (currentMinigame?.type === 'reaction') {
      setReactionState('ready');
      const delay = 1500 + Math.random() * 2000;
      setTimeout(() => {
        setReactionState('go');
        reactionStartTime.current = Date.now();
        // AI reaction time based on difficulty
        const aiDelay = difficulty === 'easy' ? 400 + Math.random() * 300 : 
                        difficulty === 'medium' ? 300 + Math.random() * 200 :
                        difficulty === 'hard' ? 200 + Math.random() * 150 : 150 + Math.random() * 100;
        setTimeout(() => {
          aiReactionTime.current = aiDelay;
          if (playerReactionTime.current === 0) {
            // AI wins
            setReactionState('done');
            setMinigameWinner('ai');
            endMinigame('ai');
          }
        }, aiDelay);
      }, delay);
    } else if (currentMinigame?.type === 'timing') {
      // Bar moves automatically
      let pos = 0;
      const interval = setInterval(() => {
        pos += 2;
        setTimingBarPos(pos);
        if (pos >= 100) {
          clearInterval(interval);
          if (!timingStopped) {
            // Player didn't stop in time
            const aiScore = 50 + Math.random() * 40;
            setAiTimingScore(aiScore);
            setMinigameWinner('ai');
            endMinigame('ai');
          }
        }
      }, 30);
      // AI will stop at a reasonable time based on difficulty
      const aiTargetDiff = difficulty === 'easy' ? 15 : difficulty === 'medium' ? 10 : difficulty === 'hard' ? 5 : 3;
      const aiStopPos = timingTarget + (Math.random() * aiTargetDiff * 2 - aiTargetDiff);
      setTimeout(() => {
        setAiTimingScore(100 - Math.abs(aiStopPos - timingTarget));
      }, (aiStopPos / 100) * 1500);
    }
  };

  const handleButtonMash = () => {
    if (!minigameActive || currentMinigame?.type !== 'button_mash') return;
    setPlayerProgress(p => {
      const newP = p + 5;
      if (newP >= 100) {
        setMinigameWinner('player');
        endMinigame('player');
        return 100;
      }
      return newP;
    });
  };

  const handleReactionTap = () => {
    if (!minigameActive || currentMinigame?.type !== 'reaction') return;
    if (reactionState === 'go') {
      playerReactionTime.current = Date.now() - reactionStartTime.current;
      setReactionState('done');
      if (aiReactionTime.current > 0 && playerReactionTime.current < aiReactionTime.current) {
        setMinigameWinner('player');
        endMinigame('player');
      } else if (aiReactionTime.current > 0) {
        setMinigameWinner('ai');
        endMinigame('ai');
      } else {
        setMinigameWinner('player');
        endMinigame('player');
      }
    } else if (reactionState === 'ready') {
      // Too early!
      setReactionState('done');
      setMinigameWinner('ai');
      endMinigame('ai');
    }
  };

  const handleTimingStop = () => {
    if (!minigameActive || currentMinigame?.type !== 'timing' || timingStopped) return;
    setTimingStopped(true);
    const playerScore = 100 - Math.abs(timingBarPos - timingTarget);
    setTimeout(() => {
      if (playerScore > aiTimingScore) {
        setMinigameWinner('player');
        endMinigame('player');
      } else {
        setMinigameWinner('ai');
        endMinigame('ai');
      }
    }, 500);
  };

  const endMinigame = (winner: 'player' | 'ai') => {
    setMinigameActive(false);
    setTimeout(() => {
      setShowMinigame(false);
      
      // Award money to winner
      const reward = currentMinigame?.reward || 25;
      const updatedPlayers = [...players];
      
      if (winner === 'player') {
        updatedPlayers[0] = { ...updatedPlayers[0], money: updatedPlayers[0].money + reward };
        setEventText(`You won ${currentMinigame?.name}! +$${reward}`);
        setEventAmount(reward);
        triggerScreenEffect(true);
      } else if (players.length > 1) {
        // Give to a random AI
        const aiIdx = 1 + Math.floor(Math.random() * (players.length - 1));
        const aiReward = Math.round(reward * AI_EARNING_MULTIPLIER[difficulty]);
        updatedPlayers[aiIdx] = { ...updatedPlayers[aiIdx], money: updatedPlayers[aiIdx].money + aiReward };
        setEventText(`${updatedPlayers[aiIdx].name} won! They got +$${aiReward}`);
        setEventAmount(-aiReward);
        triggerScreenEffect(false);
      }
      
      setPlayers(updatedPlayers);
      setShowEvent(true);
      
      setTimeout(() => {
        setShowEvent(false);
        // Continue game - next turn
        nextTurn(forkPlayerIdx, updatedPlayers);
      }, 2000);
    }, 1500);
  };

  const movePlayer = async (playerIdx: number, steps: number, playerList: Player[]) => {
    const player = playerList[playerIdx];
    const isHuman = !player.isAI;
    
    // Handle detour path with step-by-step animation
    if (player.onDetour) {
      setIsAnimating(true);
      let currentDetourPos = player.detourPosition;
      const numDetour = currentMap.detourSpaces.length;

      for (let step = 0; step < steps; step++) {
        currentDetourPos++;

        if (currentDetourPos >= numDetour) {
          // Exit detour, return to main path
          const remainingSteps = steps - step - 1;
          const mainPos = (FORK_INDEX + DETOUR_RECONNECT_OFFSET + remainingSteps) % TOTAL_SPACES;

          const angle = (mainPos / TOTAL_SPACES) * 2 * Math.PI - Math.PI / 2;
          cameraX.value = withTiming(-MAIN_RADIUS * Math.cos(angle) * 0.35, { duration: 350, easing: Easing.out(Easing.cubic) });
          cameraY.value = withTiming(-MAIN_RADIUS * Math.sin(angle) * 0.35, { duration: 350, easing: Easing.out(Easing.cubic) });

          const updatedPlayers = [...playerList];
          updatedPlayers[playerIdx] = { ...playerList[playerIdx], onDetour: false, position: mainPos, detourPosition: 0 };
          setPlayers(updatedPlayers);
          setIsAnimating(false);

          await new Promise(resolve => setTimeout(resolve, 400));
          await processSpaceEvent(playerIdx, mainPos, updatedPlayers, false);
          return;
        }

        // Still on detour - animate camera to this space
        const coords = getDetourSpaceCoords(currentDetourPos);
        cameraX.value = withTiming(-(coords.x - BOARD_CENTER) * 0.35, { duration: 350, easing: Easing.out(Easing.cubic) });
        cameraY.value = withTiming(-(coords.y - BOARD_CENTER) * 0.35, { duration: 350, easing: Easing.out(Easing.cubic) });

        const updatedPlayers = [...playerList];
        updatedPlayers[playerIdx] = { ...updatedPlayers[playerIdx], detourPosition: currentDetourPos };
        setPlayers(updatedPlayers);
        playerList = updatedPlayers;

        await new Promise(resolve => setTimeout(resolve, 400));
      }

      setIsAnimating(false);
      await processSpaceEvent(playerIdx, currentDetourPos, playerList, true);
      return;
    }
    
    // Check if passing fork
    let finalPos = player.position;
    for (let i = 1; i <= steps; i++) {
      const nextPos = (player.position + i) % TOTAL_SPACES;
      if (nextPos === FORK_INDEX) {
        finalPos = FORK_INDEX;
        break;
      }
      finalPos = nextPos;
    }
    
    // Animate movement step by step
    setIsAnimating(true);
    let pos = player.position;
    
    while (pos !== finalPos) {
      pos = (pos + 1) % TOTAL_SPACES;
      
      const angle = (pos / TOTAL_SPACES) * 2 * Math.PI - Math.PI / 2;
      cameraX.value = withTiming(-MAIN_RADIUS * Math.cos(angle) * 0.35, { duration: 320, easing: Easing.out(Easing.cubic) });
      cameraY.value = withTiming(-MAIN_RADIUS * Math.sin(angle) * 0.35, { duration: 320, easing: Easing.out(Easing.cubic) });
      
      const updatedPlayers = [...playerList];
      updatedPlayers[playerIdx] = { ...updatedPlayers[playerIdx], position: pos };
      setPlayers(updatedPlayers);
      playerList = updatedPlayers;
      
      await new Promise(resolve => setTimeout(resolve, 360));
    }
    
    setIsAnimating(false);
    
    const space = currentSpaces[finalPos];
    
    // Fork choice
    if (space.type === 'fork') {
      setForkPlayerIdx(playerIdx);
      if (isHuman) {
        setShowForkChoice(true);
        return;
      } else {
        // AI chooses randomly, slightly preferring forward
        const choice = Math.random() < 0.6 ? 'forward' : 'detour';
        await handleForkChoice(choice, playerIdx, playerList);
        return;
      }
    }
    
    // Party space - minigame!
    if (space.type === 'party' && playerList.length > 1) {
      startMinigame(playerIdx, playerList);
      return;
    }
    
    await processSpaceEvent(playerIdx, finalPos, playerList, false);
  };

  const handleForkChoice = async (choice: 'forward' | 'detour', playerIdx: number, playerList: Player[]) => {
    setShowForkChoice(false);
    
    const updatedPlayers = [...playerList];
    
    if (choice === 'detour') {
      // Go to detour path
      updatedPlayers[playerIdx] = { ...updatedPlayers[playerIdx], onDetour: true, detourPosition: 0 };
      setPlayers(updatedPlayers);
      
      // Process first detour space
      await processSpaceEvent(playerIdx, 0, updatedPlayers, true);
    } else {
      // Continue forward
      const nextPos = (FORK_INDEX + 1) % TOTAL_SPACES;
      updatedPlayers[playerIdx] = { ...updatedPlayers[playerIdx], position: nextPos };
      setPlayers(updatedPlayers);
      
      await processSpaceEvent(playerIdx, nextPos, updatedPlayers, false);
    }
  };

  const processSpaceEvent = async (playerIdx: number, position: number, playerList: Player[], isDetour: boolean) => {
    const player = playerList[playerIdx];
    const isHuman = !player.isAI;
    const space = isDetour ? currentMap.detourSpaces[position] : currentSpaces[position];
    
    let amountChange = handleSpaceEvent(player, space, isHuman);
    
    if (space.type !== 'start' && space.type !== 'rest' && space.type !== 'fork' && space.type !== 'party') {
      const sign = amountChange >= 0 ? '+' : '';
      setEventText(`${player.name}: ${space.name} ${sign}$${amountChange}`);
      setEventAmount(amountChange);
      setShowEvent(true);
      
      if (amountChange !== 0) {
        triggerScreenEffect(amountChange > 0);
      }
    }
    
    const updatedPlayers = [...playerList];
    const newMoney = Math.max(0, player.money + amountChange);
    updatedPlayers[playerIdx] = { ...updatedPlayers[playerIdx], money: newMoney };
    setPlayers(updatedPlayers);
    
    await new Promise(resolve => setTimeout(resolve, 1800));
    setShowEvent(false);
    
    if (newMoney >= GOAL_MONEY) {
      if (isHuman) {
        handleWin();
      } else {
        handleLoss(player.name);
      }
      return;
    }
    
    nextTurn(playerIdx, updatedPlayers);
  };

  const nextTurn = (currentIdx: number, playerList: Player[]) => {
    const nextIdx = (currentIdx + 1) % playerList.length;
    setCurrentPlayerIndex(nextIdx);
    
    if (nextIdx === 0) {
      setTurnCount(t => t + 1);
    }
    
    if (playerList[nextIdx].isAI) {
      setTimeout(() => aiTurn(nextIdx, playerList), 1200);
    } else {
      updateCameraForPlayer(nextIdx, playerList);
    }
  };

  const aiTurn = async (aiIdx: number, playerList: Player[]) => {
    zoomOutCamera();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    setIsRolling(true);
    diceRotation.value = withSequence(
      withTiming(360, { duration: 150 }),
      withTiming(720, { duration: 150 }),
      withTiming(1080, { duration: 150 }),
      withTiming(0, { duration: 50 })
    );
    
    await new Promise(resolve => setTimeout(resolve, 600));
    
    let roll = Math.floor(Math.random() * 6) + 1;
    
    setDiceValue(roll);
    setIsRolling(false);
    
    await new Promise(resolve => setTimeout(resolve, 400));
    
    cameraScale.value = withTiming(1.5, { duration: 500, easing: Easing.out(Easing.cubic) });
    await movePlayer(aiIdx, roll, playerList);
  };

  const rollDice = async () => {
    if (isRolling || isAnimating || showForkChoice || showMinigame) return;
    
    const currentPlayer = players[currentPlayerIndex];
    if (currentPlayer.isAI) return;
    
    zoomOutCamera();
    await new Promise(resolve => setTimeout(resolve, 400));
    
    setIsRolling(true);
    
    diceScale.value = withSequence(
      withSpring(1.3, { damping: 10 }),
      withSpring(1, { damping: 8 })
    );
    diceRotation.value = withSequence(
      withTiming(360, { duration: 150 }),
      withTiming(720, { duration: 150 }),
      withTiming(1080, { duration: 150 }),
      withTiming(0, { duration: 50 })
    );
    
    await new Promise(resolve => setTimeout(resolve, 600));
    
    let roll1: number;
    let roll2 = 0;
    
    if (activePowerup === 'lucky_roll') {
      roll1 = Math.random() < 0.5 ? 5 : 6;
      setActivePowerup(null);
    } else if (activePowerup === 'double_dice') {
      roll1 = Math.floor(Math.random() * 6) + 1;
      roll2 = Math.floor(Math.random() * 6) + 1;
      setDiceValue2(roll2);
      setActivePowerup(null);
    } else {
      roll1 = Math.floor(Math.random() * 6) + 1;
    }
    
    setDiceValue(roll1);
    setIsRolling(false);
    
    const totalRoll = roll1 + roll2;
    
    await new Promise(resolve => setTimeout(resolve, 400));
    
    cameraScale.value = withTiming(1.5, { duration: 500, easing: Easing.out(Easing.cubic) });
    setDiceValue2(0);
    await movePlayer(currentPlayerIndex, totalRoll, players);
  };

  const usePowerup = (powerup: Powerup) => {
    const currentPlayer = players[currentPlayerIndex];
    if (currentPlayer.isAI || currentPlayer.money < powerup.cost) return;
    
    const updatedPlayers = [...players];
    updatedPlayers[currentPlayerIndex] = {
      ...currentPlayer,
      money: currentPlayer.money - powerup.cost
    };
    setPlayers(updatedPlayers);
    
    if (powerup.id === 'shield') {
      setHasShield(true);
    } else if (powerup.id === 'boost') {
      setHasBoost(true);
    } else {
      setActivePowerup(powerup.id);
    }
    
    setShowPowerupModal(false);
  };

  const handleWin = async () => {
    const newWins = totalWins + 1;
    const newWinsByDiff = { ...winsByDifficulty, [difficulty]: winsByDifficulty[difficulty] + 1 };
    
    const coinRewards: Record<string, number> = { easy: 10, medium: 20, hard: 35, expert: 50 };
    let earned = coinRewards[difficulty] || 10;
    if (turnCount <= 15) earned += 10;
    else if (turnCount <= 25) earned += 5;
    
    setTotalWins(newWins);
    setWinsByDifficulty(newWinsByDiff);
    setCoins(c => c + earned);
    
    await saveLocalData();
    setCurrentScreen('win');
  };

  const handleLoss = (winnerName: string) => {
    setEventText(`${winnerName} won the game!`);
    setCurrentScreen('loss');
  };

  const purchaseCharacter = async (char: Character) => {
    if (coins < char.price || ownedCharacters.includes(char.id)) return;
    setCoins(c => c - char.price);
    setOwnedCharacters([...ownedCharacters, char.id]);
    await saveLocalData();
  };

  const fetchLeaderboard = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/leaderboard?limit=20`);
      if (response.ok) {
        const data = await response.json();
        setLeaderboard(data);
      }
    } catch (e) {
      console.log('Error fetching leaderboard:', e);
    }
    setIsLoading(false);
  };

  // Animated styles
  const cameraStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: cameraScale.value },
      { translateX: cameraX.value },
      { translateY: cameraY.value },
    ],
  }));

  const diceAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${diceRotation.value}deg` },
      { scale: diceScale.value },
    ],
  }));

  const screenEffectStyle = useAnimatedStyle(() => ({
    opacity: screenFlash.value,
    transform: [{ translateX: screenShake.value }],
  }));

  // Render dice face
  const renderDiceFace = (value: number, size: number = 50) => {
    const dotPositions: Record<number, number[][]> = {
      1: [[50, 50]],
      2: [[25, 25], [75, 75]],
      3: [[25, 25], [50, 50], [75, 75]],
      4: [[25, 25], [75, 25], [25, 75], [75, 75]],
      5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
      6: [[25, 25], [75, 25], [25, 50], [75, 50], [25, 75], [75, 75]],
    };
    const dotSize = size * 0.14;

    return (
      <View style={[styles.diceInner, { width: size, height: size }]}>
        {dotPositions[value]?.map((pos, i) => (
          <View
            key={i}
            style={{
              position: 'absolute',
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
              backgroundColor: COLORS.text,
              left: `${pos[0]}%`,
              top: `${pos[1]}%`,
              transform: [{ translateX: -dotSize / 2 }, { translateY: -dotSize / 2 }],
            }}
          />
        ))}
      </View>
    );
  };

  // Render board space
  const renderBoardSpace = (space: BoardSpace, index: number) => {
    const angle = (index / TOTAL_SPACES) * 2 * Math.PI - Math.PI / 2;
    const x = BOARD_CENTER + MAIN_RADIUS * Math.cos(angle);
    const y = BOARD_CENTER + MAIN_RADIUS * Math.sin(angle);

    const playersHere = players.filter(p => !p.onDetour && p.position === index);
    const isFork = space.type === 'fork';
    const isParty = space.type === 'party';

    return (
      <View
        key={space.id}
        style={[
          styles.boardSpace,
          {
            left: x - 18,
            top: y - 18,
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: space.color,
            borderWidth: isFork || isParty ? 3 : 0,
            borderColor: isFork ? COLORS.white : isParty ? COLORS.gold : 'transparent',
          },
        ]}
      >
        <Ionicons name={space.icon as any} size={16} color={COLORS.white} />
        {playersHere.map((p, i) => (
          <TouchableOpacity
            key={p.id}
            style={[
              styles.playerOnSpace,
              {
                backgroundColor: p.character.color,
                bottom: -6 - i * 3,
                right: -6 + i * 6,
              },
            ]}
            onPress={() => p.isAI && setShowPlayerInfo(p)}
          >
            <Ionicons name={p.character.icon as any} size={8} color={COLORS.white} />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  // Render connecting dots for detour path
  const renderDetourPath = () => {
    const forkAngle = (FORK_INDEX / TOTAL_SPACES) * 2 * Math.PI - Math.PI / 2;
    const forkX = BOARD_CENTER + MAIN_RADIUS * Math.cos(forkAngle);
    const forkY = BOARD_CENTER + MAIN_RADIUS * Math.sin(forkAngle);

    const reconnectIdx = (FORK_INDEX + DETOUR_RECONNECT_OFFSET) % TOTAL_SPACES;
    const reconnectAngle = (reconnectIdx / TOTAL_SPACES) * 2 * Math.PI - Math.PI / 2;
    const reconnectX = BOARD_CENTER + MAIN_RADIUS * Math.cos(reconnectAngle);
    const reconnectY = BOARD_CENTER + MAIN_RADIUS * Math.sin(reconnectAngle);

    const allPoints = [
      { x: forkX, y: forkY },
      ...currentMap.detourSpaces.map((_, i) => getDetourSpaceCoords(i)),
      { x: reconnectX, y: reconnectY },
    ];

    const dots: { x: number; y: number }[] = [];
    for (let i = 0; i < allPoints.length - 1; i++) {
      const from = allPoints[i];
      const to = allPoints[i + 1];
      for (let d = 1; d <= 3; d++) {
        const t = d / 4;
        dots.push({
          x: from.x + (to.x - from.x) * t,
          y: from.y + (to.y - from.y) * t,
        });
      }
    }

    return dots.map((dot, i) => (
      <View
        key={`path_dot_${i}`}
        style={{
          position: 'absolute',
          left: dot.x - 3,
          top: dot.y - 3,
          width: 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: COLORS.purple + '50',
        }}
      />
    ));
  };

  // Render detour spaces - arc outside the main circle
  const renderDetourSpaces = () => {
    return currentMap.detourSpaces.map((space, index) => {
      const { x, y } = getDetourSpaceCoords(index);
      const playersHere = players.filter(p => p.onDetour && p.detourPosition === index);

      return (
        <View
          key={`detour_${space.id}`}
          style={[
            styles.boardSpace,
            {
              left: x - 16,
              top: y - 16,
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: space.color,
              borderWidth: 2,
              borderColor: COLORS.gold,
            },
          ]}
        >
          <Ionicons name={space.icon as any} size={14} color={COLORS.white} />
          {playersHere.map((p, i) => (
            <View
              key={p.id}
              style={[
                styles.playerOnSpace,
                { backgroundColor: p.character.color, bottom: -5, right: -5 + i * 5 },
              ]}
            >
              <Ionicons name={p.character.icon as any} size={7} color={COLORS.white} />
            </View>
          ))}
        </View>
      );
    });
  };

  // Welcome Screen
  const renderWelcomeScreen = () => (
    <ScrollView contentContainerStyle={styles.welcomeContainer}>
      <Ionicons name="leaf" size={60} color={COLORS.primary} />
      <Text style={styles.welcomeTitle}>Easy Street</Text>
      <Text style={styles.welcomeSubtitle}>A calm journey to ${GOAL_MONEY}</Text>

      <View style={styles.coinDisplay}>
        <Ionicons name="logo-bitcoin" size={22} color={COLORS.gold} />
        <Text style={styles.coinText}>{coins}</Text>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Your Name</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Enter your name"
          placeholderTextColor={COLORS.textLight}
          value={playerName}
          onChangeText={setPlayerName}
          maxLength={15}
        />
      </View>

      <TouchableOpacity style={styles.characterSelectButton} onPress={() => setCurrentScreen('characters')}>
        <View style={[styles.characterIcon, { backgroundColor: selectedCharacter.color }]}>
          <Ionicons name={selectedCharacter.icon as any} size={20} color={COLORS.white} />
        </View>
        <View style={styles.characterSelectText}>
          <Text style={styles.characterSelectLabel}>Playing as</Text>
          <Text style={styles.characterSelectName}>{selectedCharacter.name}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={COLORS.textLight} />
      </TouchableOpacity>

      <View style={styles.statsRow}>
        <TouchableOpacity style={styles.statBox} onPress={() => setCurrentScreen('wins')}>
          <Ionicons name="trophy" size={18} color={COLORS.gold} />
          <Text style={styles.statValue}>{totalWins}</Text>
          <Text style={styles.statLabel}>Wins</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.statBox} onPress={() => setCurrentScreen('shop')}>
          <Ionicons name="bag" size={18} color={COLORS.primary} />
          <Text style={styles.statValue}>Shop</Text>
          <Text style={styles.statLabel}>Characters</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.startButton} onPress={() => setCurrentScreen('options')}>
        <Ionicons name="play" size={20} color={COLORS.white} />
        <Text style={styles.startButtonText}>Start Game</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.leaderboardButton} onPress={() => { fetchLeaderboard(); setCurrentScreen('leaderboard'); }}>
        <Ionicons name="podium" size={16} color={COLORS.gold} />
        <Text style={styles.leaderboardButtonText}>Leaderboard</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.soundToggle} onPress={() => setSoundEnabled(!soundEnabled)}>
        <Ionicons name={soundEnabled ? 'volume-high' : 'volume-mute'} size={20} color={COLORS.textLight} />
      </TouchableOpacity>
    </ScrollView>
  );

  // Options Screen
  const renderOptionsScreen = () => {
    const expertLocked = totalWins < 10;

    return (
      <View style={styles.screenContainer}>
        <View style={styles.screenHeader}>
          <TouchableOpacity onPress={() => setCurrentScreen('welcome')}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.screenTitle}>Game Options</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.optionsContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.optionLabel}>Game Mode</Text>
          <View style={styles.modeButtons}>
            <TouchableOpacity style={[styles.modeButton, isSolo && styles.modeButtonActive]} onPress={() => setIsSolo(true)}>
              <Ionicons name="person" size={22} color={isSolo ? COLORS.white : COLORS.text} />
              <Text style={[styles.modeButtonText, isSolo && styles.modeButtonTextActive]}>Solo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modeButton, !isSolo && styles.modeButtonActive]} onPress={() => setIsSolo(false)}>
              <Ionicons name="people" size={22} color={!isSolo ? COLORS.white : COLORS.text} />
              <Text style={[styles.modeButtonText, !isSolo && styles.modeButtonTextActive]}>Multiplayer</Text>
            </TouchableOpacity>
          </View>

          {!isSolo && (
            <>
              <Text style={styles.optionLabel}>Number of Players</Text>
              <View style={styles.aiCountRow}>
                {[1, 2, 3, 4].map(num => (
                  <TouchableOpacity key={num} style={[styles.aiCountButton, aiCount === num && styles.aiCountButtonActive]} onPress={() => setAiCount(num)}>
                    <Text style={[styles.aiCountText, aiCount === num && styles.aiCountTextActive]}>{num + 1}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          <Text style={styles.optionLabel}>Difficulty</Text>
          <View style={[styles.difficultyGrid, isSolo && styles.disabledSection]}>
            {(['easy', 'medium', 'hard', 'expert'] as const).map((diff) => {
              const isExpertLocked = diff === 'expert' && expertLocked;
              const isSelected = difficulty === diff;
              const isDisabled = isSolo || isExpertLocked;

              return (
                <TouchableOpacity
                  key={diff}
                  style={[styles.difficultyButton, isSelected && !isSolo && styles.difficultyButtonActive, isDisabled && styles.difficultyButtonDisabled]}
                  onPress={() => !isDisabled && setDifficulty(diff)}
                  disabled={isDisabled}
                >
                  {isExpertLocked && !isSolo && (
                    <View style={styles.lockedBadge}>
                      <Ionicons name="lock-closed" size={10} color={COLORS.white} />
                    </View>
                  )}
                  <Text style={[styles.difficultyText, isSelected && !isSolo && styles.difficultyTextActive, isDisabled && styles.difficultyTextDisabled]}>
                    {diff.charAt(0).toUpperCase() + diff.slice(1)}
                  </Text>
                  {isExpertLocked && !isSolo && <Text style={styles.lockLabel}>10 wins</Text>}
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.optionLabel}>Map</Text>
          <View style={styles.mapGrid}>
            {Object.entries(MAP_LAYOUTS).map(([key, layout]) => (
              <TouchableOpacity key={key} style={[styles.mapButton, mapType === key && styles.mapButtonActive]} onPress={() => setMapType(key as any)}>
                <Text style={[styles.mapButtonText, mapType === key && styles.mapButtonTextActive]}>{layout.name}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.playButton} onPress={startLoadingScreen}>
            <Ionicons name="game-controller" size={22} color={COLORS.white} />
            <Text style={styles.playButtonText}>Play!</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  };

  // Loading Screen
  const renderLoadingScreen = () => {
    const totalPlayers = isSolo ? 1 : aiCount + 1;
    
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingTitle}>Finding Players...</Text>
        <Text style={styles.loadingCount}>{loadingProgress}/{totalPlayers}</Text>
        
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginVertical: 20 }} />
        
        <View style={styles.lobbySlots}>
          {[0, 1, 2, 3].map(i => {
            const player = loadedPlayers[i];
            const isEmpty = !player;
            
            return (
              <View key={i} style={[styles.lobbySlot, isEmpty && styles.lobbySlotEmpty]}>
                {player ? (
                  <>
                    {i === 0 && <Ionicons name="crown" size={16} color={COLORS.gold} style={styles.crownIcon} />}
                    <View style={[styles.lobbySlotIcon, { backgroundColor: player.character.color }]}>
                      <Ionicons name={player.character.icon as any} size={20} color={COLORS.white} />
                    </View>
                    <Text style={styles.lobbySlotName}>{player.name}</Text>
                  </>
                ) : (
                  <Ionicons name="person-outline" size={24} color={COLORS.disabled} />
                )}
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  // Game Screen
  const renderGameScreen = () => {
    const currentPlayer = players[currentPlayerIndex];
    const isMyTurn = currentPlayer && !currentPlayer.isAI;
    const humanPlayer = players[0];

    return (
      <View style={styles.gameContainer}>
        <Animated.View style={[styles.screenEffectOverlay, screenEffectStyle, { backgroundColor: flashColor.current === 'positive' ? COLORS.positive : COLORS.red }]} pointerEvents="none" />

        <View style={styles.gameHeader}>
          <View style={styles.gameHeaderLeft}>
            <Text style={styles.turnText}>Turn {turnCount + 1}</Text>
            <Text style={styles.currentPlayerText}>{currentPlayer?.name}'s turn</Text>
          </View>
          <View style={styles.moneyDisplay}>
            <Ionicons name="cash" size={16} color={COLORS.positive} />
            <Text style={styles.moneyText}>${humanPlayer?.money || 0}</Text>
          </View>
        </View>

        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${Math.min(100, ((humanPlayer?.money || 0) / GOAL_MONEY) * 100)}%` }]} />
        </View>

        <ScrollView horizontal style={styles.playersBar} showsHorizontalScrollIndicator={false}>
          {players.map((p, i) => (
            <TouchableOpacity key={p.id} style={[styles.playerChip, i === currentPlayerIndex && styles.playerChipActive]} onPress={() => p.isAI && setShowPlayerInfo(p)}>
              <View style={[styles.playerChipIcon, { backgroundColor: p.character.color }]}>
                <Ionicons name={p.character.icon as any} size={12} color={COLORS.white} />
              </View>
              <View>
                <Text style={styles.playerChipName}>{p.name}</Text>
                <Text style={styles.playerChipMoney}>${p.money}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.boardWrapper}>
          <Animated.View style={[styles.boardContainer, cameraStyle]}>
            <View style={styles.board}>
              {renderDetourPath()}
              {currentSpaces.map((space, index) => renderBoardSpace(space, index))}
              {renderDetourSpaces()}
              <View style={styles.boardCenter}>
                <Text style={styles.boardCenterTitle}>{currentMap.name}</Text>
              </View>
            </View>
          </Animated.View>
        </View>

        {showEvent && (
          <View style={[styles.eventPopup, { borderColor: eventAmount >= 0 ? COLORS.positive : COLORS.red }]}>
            <Text style={[styles.eventText, { color: eventAmount >= 0 ? COLORS.positive : COLORS.negative }]}>{eventText}</Text>
          </View>
        )}

        {showForkChoice && (
          <View style={styles.forkModal}>
            <Text style={styles.forkTitle}>Choose Your Path!</Text>
            <Text style={styles.forkSubtitle}>Go forward or take the left bypass?</Text>
            <View style={styles.forkButtons}>
              <TouchableOpacity style={[styles.forkButton, { backgroundColor: COLORS.primary }]} onPress={() => handleForkChoice('forward', forkPlayerIdx, players)}>
                <Ionicons name="arrow-forward" size={24} color={COLORS.white} />
                <Text style={styles.forkButtonText}>Forward</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.forkButton, { backgroundColor: COLORS.purple }]} onPress={() => handleForkChoice('detour', forkPlayerIdx, players)}>
                <Ionicons name="return-down-back" size={24} color={COLORS.white} />
                <Text style={styles.forkButtonText}>Left</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.controlsArea}>
          {(hasShield || hasBoost || activePowerup) && (
            <View style={styles.activePowerups}>
              {hasShield && <View style={styles.activePowerupBadge}><Ionicons name="shield" size={12} color={COLORS.white} /></View>}
              {hasBoost && <View style={styles.activePowerupBadge}><Ionicons name="trending-up" size={12} color={COLORS.white} /></View>}
              {activePowerup && <View style={styles.activePowerupBadge}><Ionicons name={activePowerup === 'double_dice' ? 'dice' : 'star'} size={12} color={COLORS.white} /></View>}
            </View>
          )}

          <View style={styles.diceArea}>
            <Animated.View style={[styles.dice, diceAnimatedStyle]}>{renderDiceFace(diceValue, 50)}</Animated.View>
            {diceValue2 > 0 && <View style={[styles.dice, { marginLeft: 8 }]}>{renderDiceFace(diceValue2, 50)}</View>}
          </View>

          <View style={styles.buttonsRow}>
            {isMyTurn && (
              <TouchableOpacity style={styles.powerupButton} onPress={() => setShowPowerupModal(true)} disabled={isRolling || isAnimating}>
                <Ionicons name="flash" size={18} color={COLORS.gold} />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.rollButton, (!isMyTurn || isRolling || isAnimating || showForkChoice) && styles.rollButtonDisabled]}
              onPress={rollDice}
              disabled={!isMyTurn || isRolling || isAnimating || showForkChoice}
            >
              <Ionicons name={isRolling ? 'hourglass' : 'dice'} size={18} color={COLORS.white} />
              <Text style={styles.rollButtonText}>{isRolling ? 'Rolling...' : isAnimating ? 'Moving...' : !isMyTurn ? 'Wait...' : 'Roll'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Minigame Modal */}
        <Modal visible={showMinigame} transparent animationType="fade">
          <View style={styles.minigameOverlay}>
            <View style={styles.minigameModal}>
              {showMinigameTutorial ? (
                <>
                  <Ionicons name="game-controller" size={50} color={COLORS.party} />
                  <Text style={styles.minigameTitle}>{currentMinigame?.name}</Text>
                  <Text style={styles.minigameDesc}>{currentMinigame?.description}</Text>
                  <Text style={styles.minigameReward}>Winner gets ${currentMinigame?.reward}!</Text>
                  <TouchableOpacity style={styles.minigameStartBtn} onPress={beginMinigame}>
                    <Text style={styles.minigameStartText}>Ready!</Text>
                  </TouchableOpacity>
                </>
              ) : minigameWinner ? (
                <>
                  <Ionicons name={minigameWinner === 'player' ? 'trophy' : 'sad'} size={50} color={minigameWinner === 'player' ? COLORS.gold : COLORS.accent} />
                  <Text style={styles.minigameTitle}>{minigameWinner === 'player' ? 'You Won!' : 'You Lost!'}</Text>
                </>
              ) : currentMinigame?.type === 'button_mash' ? (
                <>
                  <Text style={styles.minigameTitle}>TAP TAP TAP!</Text>
                  <View style={styles.progressBarsContainer}>
                    <View style={styles.progressBarRow}>
                      <Text style={styles.progressLabel}>You</Text>
                      <View style={styles.minigameBar}><View style={[styles.minigameBarFill, { width: `${playerProgress}%`, backgroundColor: COLORS.primary }]} /></View>
                    </View>
                    <View style={styles.progressBarRow}>
                      <Text style={styles.progressLabel}>AI</Text>
                      <View style={styles.minigameBar}><View style={[styles.minigameBarFill, { width: `${aiProgress}%`, backgroundColor: COLORS.red }]} /></View>
                    </View>
                  </View>
                  <TouchableOpacity style={styles.mashButton} onPress={handleButtonMash}>
                    <Ionicons name="hand-left" size={40} color={COLORS.white} />
                    <Text style={styles.mashButtonText}>TAP!</Text>
                  </TouchableOpacity>
                </>
              ) : currentMinigame?.type === 'reaction' ? (
                <>
                  <Text style={styles.minigameTitle}>{reactionState === 'ready' ? 'Wait...' : reactionState === 'go' ? 'TAP NOW!' : 'Get Ready!'}</Text>
                  <TouchableOpacity
                    style={[styles.reactionCircle, { backgroundColor: reactionState === 'go' ? COLORS.positive : reactionState === 'ready' ? COLORS.red : COLORS.disabled }]}
                    onPress={handleReactionTap}
                    disabled={reactionState !== 'ready' && reactionState !== 'go'}
                  >
                    <Ionicons name={reactionState === 'go' ? 'checkmark' : 'time'} size={50} color={COLORS.white} />
                  </TouchableOpacity>
                  {reactionState === 'ready' && <Text style={styles.reactionHint}>Don't tap yet!</Text>}
                </>
              ) : currentMinigame?.type === 'timing' ? (
                <>
                  <Text style={styles.minigameTitle}>Stop at the Target!</Text>
                  <View style={styles.timingContainer}>
                    <View style={styles.timingBar}>
                      <View style={[styles.timingTarget, { left: `${timingTarget - 5}%` }]} />
                      <View style={[styles.timingMarker, { left: `${timingBarPos}%` }]} />
                    </View>
                  </View>
                  <TouchableOpacity style={styles.timingStopBtn} onPress={handleTimingStop} disabled={timingStopped}>
                    <Text style={styles.timingStopText}>{timingStopped ? 'Stopped!' : 'STOP!'}</Text>
                  </TouchableOpacity>
                </>
              ) : null}
            </View>
          </View>
        </Modal>

        {/* Powerup Modal */}
        <Modal visible={showPowerupModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.powerupModal}>
              <Text style={styles.modalTitle}>Buy Power-up</Text>
              <Text style={styles.modalSubtitle}>Your money: ${humanPlayer?.money || 0}</Text>
              {POWERUPS.map(p => {
                const canAfford = (humanPlayer?.money || 0) >= p.cost;
                return (
                  <TouchableOpacity key={p.id} style={[styles.powerupItem, !canAfford && styles.powerupItemDisabled]} onPress={() => canAfford && usePowerup(p)} disabled={!canAfford}>
                    <View style={[styles.powerupIcon, !canAfford && { backgroundColor: COLORS.disabled }]}>
                      <Ionicons name={p.icon as any} size={20} color={COLORS.white} />
                    </View>
                    <View style={styles.powerupInfo}>
                      <Text style={styles.powerupName}>{p.name}</Text>
                      <Text style={styles.powerupDesc}>{p.description}</Text>
                    </View>
                    <Text style={[styles.powerupCost, !canAfford && { color: COLORS.disabled }]}>${p.cost}</Text>
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity style={styles.modalClose} onPress={() => setShowPowerupModal(false)}>
                <Text style={styles.modalCloseText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Player Info Modal */}
        <Modal visible={!!showPlayerInfo} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.playerInfoModal}>
              {showPlayerInfo && (
                <>
                  <View style={[styles.playerInfoIcon, { backgroundColor: showPlayerInfo.character.color }]}>
                    <Ionicons name={showPlayerInfo.character.icon as any} size={36} color={COLORS.white} />
                  </View>
                  <Text style={styles.playerInfoName}>{showPlayerInfo.name}</Text>
                  <View style={styles.playerInfoStats}>
                    <View style={styles.playerInfoStat}>
                      <Text style={styles.playerInfoStatValue}>{showPlayerInfo.fakeWins}</Text>
                      <Text style={styles.playerInfoStatLabel}>Wins</Text>
                    </View>
                    <View style={styles.playerInfoStat}>
                      <Text style={styles.playerInfoStatValue}>${showPlayerInfo.money}</Text>
                      <Text style={styles.playerInfoStatLabel}>Current</Text>
                    </View>
                  </View>
                  <TouchableOpacity style={styles.modalClose} onPress={() => setShowPlayerInfo(null)}>
                    <Text style={styles.modalCloseText}>Close</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </Modal>
      </View>
    );
  };

  // Win Screen
  const renderWinScreen = () => (
    <View style={styles.resultContainer}>
      <Ionicons name="trophy" size={70} color={COLORS.gold} />
      <Text style={styles.resultTitle}>You Won!</Text>
      <Text style={styles.resultSubtitle}>Reached ${players[0]?.money || GOAL_MONEY} in {turnCount + 1} turns</Text>
      
      <View style={styles.rewardBox}>
        <Ionicons name="logo-bitcoin" size={24} color={COLORS.gold} />
        <Text style={styles.rewardText}>+{difficulty === 'expert' ? 50 : difficulty === 'hard' ? 35 : difficulty === 'medium' ? 20 : 10} coins</Text>
      </View>

      <TouchableOpacity style={styles.startButton} onPress={() => setCurrentScreen('welcome')}>
        <Ionicons name="home" size={20} color={COLORS.white} />
        <Text style={styles.startButtonText}>Menu</Text>
      </TouchableOpacity>
    </View>
  );

  // Loss Screen
  const renderLossScreen = () => (
    <View style={styles.resultContainer}>
      <Ionicons name="sad" size={70} color={COLORS.accent} />
      <Text style={styles.resultTitle}>You Lost</Text>
      <Text style={styles.resultSubtitle}>{eventText}</Text>

      <TouchableOpacity style={styles.startButton} onPress={() => setCurrentScreen('welcome')}>
        <Ionicons name="refresh" size={20} color={COLORS.white} />
        <Text style={styles.startButtonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );

  // Wins Screen
  const renderWinsScreen = () => (
    <View style={styles.screenContainer}>
      <View style={styles.screenHeader}>
        <TouchableOpacity onPress={() => setCurrentScreen('welcome')}><Ionicons name="arrow-back" size={24} color={COLORS.text} /></TouchableOpacity>
        <Text style={styles.screenTitle}>Your Wins</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.winsContent}>
        <View style={styles.totalWinsBox}>
          <Ionicons name="trophy" size={44} color={COLORS.gold} />
          <Text style={styles.totalWinsValue}>{totalWins}</Text>
          <Text style={styles.totalWinsLabel}>Total Wins</Text>
        </View>

        <View style={styles.winsByDiffGrid}>
          {(['easy', 'medium', 'hard', 'expert'] as const).map(diff => (
            <View key={diff} style={styles.winDiffBox}>
              <Text style={styles.winDiffValue}>{winsByDifficulty[diff]}</Text>
              <Text style={styles.winDiffLabel}>{diff.charAt(0).toUpperCase() + diff.slice(1)}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );

  // Characters Screen
  const renderCharactersScreen = () => (
    <View style={styles.screenContainer}>
      <View style={styles.screenHeader}>
        <TouchableOpacity onPress={() => setCurrentScreen('welcome')}><Ionicons name="arrow-back" size={24} color={COLORS.text} /></TouchableOpacity>
        <Text style={styles.screenTitle}>Characters</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={CHARACTERS}
        numColumns={2}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.characterGrid}
        renderItem={({ item }) => {
          const isOwned = ownedCharacters.includes(item.id);
          const isSelected = selectedCharacter.id === item.id;

          return (
            <TouchableOpacity style={[styles.characterCard, isSelected && styles.characterCardSelected, !isOwned && styles.characterCardLocked]} onPress={() => isOwned && setSelectedCharacter(item)}>
              <View style={[styles.characterCardIcon, { backgroundColor: isOwned ? item.color : COLORS.disabled }]}>
                <Ionicons name={isOwned ? item.icon as any : 'lock-closed'} size={26} color={COLORS.white} />
              </View>
              <Text style={styles.characterCardName}>{isOwned ? item.name : '???'}</Text>
              {!isOwned && <Text style={styles.characterCardPrice}>{item.price} coins</Text>}
              {isSelected && <View style={styles.selectedBadge}><Ionicons name="checkmark" size={10} color={COLORS.white} /></View>}
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );

  // Shop Screen
  const renderShopScreen = () => (
    <View style={styles.screenContainer}>
      <View style={styles.screenHeader}>
        <TouchableOpacity onPress={() => setCurrentScreen('welcome')}><Ionicons name="arrow-back" size={24} color={COLORS.text} /></TouchableOpacity>
        <Text style={styles.screenTitle}>Shop</Text>
        <View style={styles.shopCoins}>
          <Ionicons name="logo-bitcoin" size={16} color={COLORS.gold} />
          <Text style={styles.shopCoinsText}>{coins}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.shopContent}>
        <Text style={styles.shopSection}>Characters</Text>
        {CHARACTERS.filter(c => !ownedCharacters.includes(c.id)).map(c => (
          <TouchableOpacity key={c.id} style={styles.shopItem} onPress={() => purchaseCharacter(c)} disabled={coins < c.price}>
            <View style={[styles.shopItemIcon, { backgroundColor: c.color }]}>
              <Ionicons name={c.icon as any} size={20} color={COLORS.white} />
            </View>
            <View style={styles.shopItemInfo}><Text style={styles.shopItemName}>{c.name}</Text></View>
            <View style={[styles.shopItemPrice, coins < c.price && styles.shopItemPriceDisabled]}>
              <Ionicons name="logo-bitcoin" size={12} color={coins < c.price ? COLORS.disabled : COLORS.gold} />
              <Text style={[styles.shopItemPriceText, coins < c.price && { color: COLORS.disabled }]}>{c.price}</Text>
            </View>
          </TouchableOpacity>
        ))}
        {CHARACTERS.filter(c => !ownedCharacters.includes(c.id)).length === 0 && <Text style={styles.emptyShopText}>You own all characters!</Text>}
      </ScrollView>
    </View>
  );

  // Leaderboard Screen
  const renderLeaderboardScreen = () => (
    <View style={styles.screenContainer}>
      <View style={styles.screenHeader}>
        <TouchableOpacity onPress={() => setCurrentScreen('welcome')}><Ionicons name="arrow-back" size={24} color={COLORS.text} /></TouchableOpacity>
        <Text style={styles.screenTitle}>Leaderboard</Text>
        <TouchableOpacity onPress={fetchLeaderboard}><Ionicons name="refresh" size={20} color={COLORS.text} /></TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : leaderboard.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="trophy-outline" size={44} color={COLORS.textLight} />
          <Text style={styles.emptyText}>No winners yet!</Text>
        </View>
      ) : (
        <FlatList
          data={leaderboard}
          keyExtractor={(item, index) => `${item.player_id}_${index}`}
          contentContainerStyle={{ padding: 14 }}
          renderItem={({ item, index }) => {
            const char = CHARACTERS.find(c => c.id === item.character) || CHARACTERS[0];
            return (
              <View style={[styles.leaderboardItem, index === 0 && styles.leaderboardItemFirst]}>
                <View style={styles.leaderboardRank}>
                  {index < 3 ? <Ionicons name="trophy" size={20} color={index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : '#CD7F32'} /> : <Text style={styles.rankNumber}>#{index + 1}</Text>}
                </View>
                <View style={[styles.leaderboardChar, { backgroundColor: char.color }]}>
                  <Ionicons name={char.icon as any} size={14} color={COLORS.white} />
                </View>
                <View style={styles.leaderboardInfo}>
                  <Text style={styles.leaderboardName}>{item.player_name}</Text>
                  <Text style={styles.leaderboardStats}>{item.turn_count} turns</Text>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {currentScreen === 'welcome' && renderWelcomeScreen()}
      {currentScreen === 'options' && renderOptionsScreen()}
      {currentScreen === 'loading' && renderLoadingScreen()}
      {currentScreen === 'game' && renderGameScreen()}
      {currentScreen === 'win' && renderWinScreen()}
      {currentScreen === 'loss' && renderLossScreen()}
      {currentScreen === 'wins' && renderWinsScreen()}
      {currentScreen === 'characters' && renderCharactersScreen()}
      {currentScreen === 'shop' && renderShopScreen()}
      {currentScreen === 'leaderboard' && renderLeaderboardScreen()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  screenContainer: { flex: 1 },
  screenHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
  screenTitle: { fontSize: 17, fontWeight: 'bold', color: COLORS.text },
  welcomeContainer: { flexGrow: 1, alignItems: 'center', padding: 18, paddingTop: 30 },
  welcomeTitle: { fontSize: 30, fontWeight: 'bold', color: COLORS.text, marginTop: 10 },
  welcomeSubtitle: { fontSize: 13, color: COLORS.textLight, marginTop: 4, marginBottom: 14 },
  coinDisplay: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 18, marginBottom: 16 },
  coinText: { fontSize: 16, fontWeight: 'bold', color: COLORS.text, marginLeft: 5 },
  inputContainer: { width: '100%', marginBottom: 10 },
  inputLabel: { fontSize: 11, color: COLORS.textLight, marginBottom: 4, marginLeft: 4 },
  textInput: { backgroundColor: COLORS.white, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: COLORS.text },
  characterSelectButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, borderRadius: 10, padding: 10, width: '100%', marginBottom: 14 },
  characterIcon: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  characterSelectText: { flex: 1, marginLeft: 10 },
  characterSelectLabel: { fontSize: 10, color: COLORS.textLight },
  characterSelectName: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  statsRow: { flexDirection: 'row', marginBottom: 16, gap: 10, width: '100%' },
  statBox: { flex: 1, backgroundColor: COLORS.white, borderRadius: 10, padding: 12, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: 'bold', color: COLORS.text, marginTop: 3 },
  statLabel: { fontSize: 10, color: COLORS.textLight, marginTop: 2 },
  startButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary, paddingHorizontal: 32, paddingVertical: 12, borderRadius: 22, marginBottom: 10 },
  startButtonText: { fontSize: 15, fontWeight: 'bold', color: COLORS.white, marginLeft: 6 },
  leaderboardButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  leaderboardButtonText: { fontSize: 13, color: COLORS.text, marginLeft: 5 },
  soundToggle: { position: 'absolute', top: 14, right: 14, padding: 6 },
  optionsContent: { padding: 14, paddingBottom: 30 },
  optionLabel: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 8, marginTop: 14 },
  modeButtons: { flexDirection: 'row', gap: 10 },
  modeButton: { flex: 1, backgroundColor: COLORS.white, borderRadius: 10, padding: 14, alignItems: 'center' },
  modeButtonActive: { backgroundColor: COLORS.primary },
  modeButtonText: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginTop: 4 },
  modeButtonTextActive: { color: COLORS.white },
  aiCountRow: { flexDirection: 'row', gap: 8 },
  aiCountButton: { flex: 1, backgroundColor: COLORS.white, borderRadius: 10, padding: 12, alignItems: 'center' },
  aiCountButtonActive: { backgroundColor: COLORS.primary },
  aiCountText: { fontSize: 16, fontWeight: 'bold', color: COLORS.text },
  aiCountTextActive: { color: COLORS.white },
  difficultyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  disabledSection: { opacity: 0.35 },
  difficultyButton: { width: '48%', backgroundColor: COLORS.white, borderRadius: 10, padding: 12, alignItems: 'center' },
  difficultyButtonActive: { backgroundColor: COLORS.primary },
  difficultyButtonDisabled: { backgroundColor: COLORS.boardBg },
  difficultyText: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  difficultyTextActive: { color: COLORS.white },
  difficultyTextDisabled: { color: COLORS.disabled },
  lockedBadge: { position: 'absolute', top: 5, right: 5, backgroundColor: COLORS.textLight, borderRadius: 8, padding: 2 },
  lockLabel: { fontSize: 9, color: COLORS.textLight, marginTop: 3 },
  mapGrid: { flexDirection: 'row', gap: 8 },
  mapButton: { flex: 1, backgroundColor: COLORS.white, borderRadius: 10, padding: 10, alignItems: 'center' },
  mapButtonActive: { backgroundColor: COLORS.primary },
  mapButtonText: { fontSize: 12, fontWeight: '600', color: COLORS.text },
  mapButtonTextActive: { color: COLORS.white },
  playButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary, borderRadius: 22, padding: 14, marginTop: 24 },
  playButtonText: { fontSize: 16, fontWeight: 'bold', color: COLORS.white, marginLeft: 8 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingTitle: { fontSize: 22, fontWeight: 'bold', color: COLORS.text },
  loadingCount: { fontSize: 16, color: COLORS.textLight, marginTop: 6 },
  lobbySlots: { flexDirection: 'row', marginTop: 20, gap: 12 },
  lobbySlot: { width: 70, height: 90, backgroundColor: COLORS.white, borderRadius: 12, alignItems: 'center', justifyContent: 'center', padding: 8 },
  lobbySlotEmpty: { backgroundColor: COLORS.boardBg },
  lobbySlotIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  lobbySlotName: { fontSize: 11, fontWeight: '600', color: COLORS.text, marginTop: 6, textAlign: 'center' },
  crownIcon: { position: 'absolute', top: -8 },
  gameContainer: { flex: 1 },
  screenEffectOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 },
  gameHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8 },
  gameHeaderLeft: {},
  turnText: { fontSize: 11, color: COLORS.textLight },
  currentPlayerText: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  moneyDisplay: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14 },
  moneyText: { fontSize: 14, fontWeight: 'bold', color: COLORS.text, marginLeft: 4 },
  progressBar: { height: 5, backgroundColor: COLORS.boardBg, marginHorizontal: 14, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 3 },
  playersBar: { maxHeight: 50, paddingHorizontal: 10, marginTop: 6 },
  playerChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, borderRadius: 16, paddingHorizontal: 8, paddingVertical: 4, marginRight: 6 },
  playerChipActive: { borderWidth: 2, borderColor: COLORS.primary },
  playerChipIcon: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 5 },
  playerChipName: { fontSize: 11, fontWeight: '600', color: COLORS.text },
  playerChipMoney: { fontSize: 9, color: COLORS.textLight },
  boardWrapper: { flex: 1, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  boardContainer: { width: BOARD_SIZE, height: BOARD_SIZE },
  board: { width: BOARD_SIZE, height: BOARD_SIZE, backgroundColor: COLORS.boardBg, borderRadius: BOARD_SIZE / 2, position: 'relative', overflow: 'visible' },
  boardSpace: { position: 'absolute', justifyContent: 'center', alignItems: 'center' },
  playerOnSpace: { position: 'absolute', width: 16, height: 16, borderRadius: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: COLORS.white },
  boardCenter: { position: 'absolute', top: '50%', left: '50%', transform: [{ translateX: -35 }, { translateY: -12 }], width: 70, alignItems: 'center' },
  boardCenterTitle: { fontSize: 11, fontWeight: 'bold', color: COLORS.text, textAlign: 'center' },
  eventPopup: { position: 'absolute', top: '32%', left: 18, right: 18, backgroundColor: COLORS.white, padding: 12, borderRadius: 10, alignItems: 'center', borderWidth: 2 },
  eventText: { fontSize: 15, fontWeight: 'bold', textAlign: 'center' },
  forkModal: { position: 'absolute', top: '32%', left: 20, right: 20, backgroundColor: COLORS.white, padding: 20, borderRadius: 14, alignItems: 'center', elevation: 5 },
  forkTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text, marginBottom: 6 },
  forkSubtitle: { fontSize: 12, color: COLORS.textLight, marginBottom: 16, textAlign: 'center' },
  forkButtons: { flexDirection: 'row', gap: 16 },
  forkButton: { paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  forkButtonText: { fontSize: 14, fontWeight: 'bold', color: COLORS.white, marginTop: 4 },
  controlsArea: { padding: 14, alignItems: 'center' },
  activePowerups: { flexDirection: 'row', marginBottom: 6, gap: 5 },
  activePowerupBadge: { backgroundColor: COLORS.primary, borderRadius: 10, padding: 5 },
  diceArea: { flexDirection: 'row', marginBottom: 10 },
  dice: { width: 50, height: 50, backgroundColor: COLORS.white, borderRadius: 8, justifyContent: 'center', alignItems: 'center', elevation: 2 },
  diceInner: { position: 'relative' },
  buttonsRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  powerupButton: { backgroundColor: COLORS.white, borderRadius: 18, padding: 10, elevation: 2 },
  rollButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20 },
  rollButtonDisabled: { backgroundColor: COLORS.textLight },
  rollButtonText: { fontSize: 14, fontWeight: 'bold', color: COLORS.white, marginLeft: 6 },
  // Minigame styles
  minigameOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  minigameModal: { backgroundColor: COLORS.white, borderRadius: 20, padding: 24, alignItems: 'center', width: '100%', maxWidth: 320 },
  minigameTitle: { fontSize: 22, fontWeight: 'bold', color: COLORS.text, marginTop: 12 },
  minigameDesc: { fontSize: 14, color: COLORS.textLight, textAlign: 'center', marginTop: 10, lineHeight: 20 },
  minigameReward: { fontSize: 16, fontWeight: 'bold', color: COLORS.gold, marginTop: 12 },
  minigameStartBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 40, paddingVertical: 14, borderRadius: 25, marginTop: 20 },
  minigameStartText: { fontSize: 18, fontWeight: 'bold', color: COLORS.white },
  progressBarsContainer: { width: '100%', marginTop: 20 },
  progressBarRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  progressLabel: { width: 30, fontSize: 12, fontWeight: '600', color: COLORS.text },
  minigameBar: { flex: 1, height: 20, backgroundColor: COLORS.boardBg, borderRadius: 10, overflow: 'hidden' },
  minigameBarFill: { height: '100%', borderRadius: 10 },
  mashButton: { backgroundColor: COLORS.party, width: 120, height: 120, borderRadius: 60, justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  mashButtonText: { fontSize: 16, fontWeight: 'bold', color: COLORS.white, marginTop: 4 },
  reactionCircle: { width: 150, height: 150, borderRadius: 75, justifyContent: 'center', alignItems: 'center', marginTop: 30 },
  reactionHint: { fontSize: 14, color: COLORS.red, marginTop: 12, fontWeight: '600' },
  timingContainer: { width: '100%', marginTop: 30 },
  timingBar: { height: 40, backgroundColor: COLORS.boardBg, borderRadius: 20, position: 'relative', overflow: 'hidden' },
  timingTarget: { position: 'absolute', width: '10%', height: '100%', backgroundColor: COLORS.positive + '60' },
  timingMarker: { position: 'absolute', width: 8, height: '100%', backgroundColor: COLORS.party, borderRadius: 4 },
  timingStopBtn: { backgroundColor: COLORS.party, paddingHorizontal: 50, paddingVertical: 16, borderRadius: 25, marginTop: 24 },
  timingStopText: { fontSize: 18, fontWeight: 'bold', color: COLORS.white },
  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 18 },
  powerupModal: { backgroundColor: COLORS.white, borderRadius: 14, padding: 18, width: '100%', maxWidth: 300 },
  modalTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.text, textAlign: 'center' },
  modalSubtitle: { fontSize: 12, color: COLORS.textLight, textAlign: 'center', marginBottom: 12 },
  powerupItem: { flexDirection: 'row', alignItems: 'center', padding: 10, backgroundColor: COLORS.background, borderRadius: 10, marginBottom: 6 },
  powerupItemDisabled: { opacity: 0.5 },
  powerupIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  powerupInfo: { flex: 1, marginLeft: 10 },
  powerupName: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  powerupDesc: { fontSize: 10, color: COLORS.textLight },
  powerupCost: { fontSize: 14, fontWeight: 'bold', color: COLORS.primary },
  modalClose: { backgroundColor: COLORS.boardBg, borderRadius: 10, padding: 10, alignItems: 'center', marginTop: 6 },
  modalCloseText: { fontSize: 13, fontWeight: '600', color: COLORS.textLight },
  playerInfoModal: { backgroundColor: COLORS.white, borderRadius: 14, padding: 20, alignItems: 'center', width: '75%' },
  playerInfoIcon: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  playerInfoName: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
  playerInfoStats: { flexDirection: 'row', marginTop: 14, gap: 18 },
  playerInfoStat: { alignItems: 'center' },
  playerInfoStatValue: { fontSize: 20, fontWeight: 'bold', color: COLORS.text },
  playerInfoStatLabel: { fontSize: 11, color: COLORS.textLight },
  resultContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  resultTitle: { fontSize: 28, fontWeight: 'bold', color: COLORS.text, marginTop: 14 },
  resultSubtitle: { fontSize: 14, color: COLORS.textLight, marginTop: 6, textAlign: 'center' },
  rewardBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 14, marginTop: 20, marginBottom: 28 },
  rewardText: { fontSize: 18, fontWeight: 'bold', color: COLORS.gold, marginLeft: 6 },
  winsContent: { flex: 1, padding: 18, alignItems: 'center' },
  totalWinsBox: { backgroundColor: COLORS.white, borderRadius: 14, padding: 26, alignItems: 'center', marginBottom: 20 },
  totalWinsValue: { fontSize: 42, fontWeight: 'bold', color: COLORS.text, marginTop: 6 },
  totalWinsLabel: { fontSize: 13, color: COLORS.textLight },
  winsByDiffGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, width: '100%' },
  winDiffBox: { width: '47%', backgroundColor: COLORS.white, borderRadius: 10, padding: 14, alignItems: 'center' },
  winDiffValue: { fontSize: 24, fontWeight: 'bold', color: COLORS.text },
  winDiffLabel: { fontSize: 12, color: COLORS.textLight, marginTop: 3 },
  characterGrid: { padding: 10 },
  characterCard: { flex: 1, margin: 5, backgroundColor: COLORS.white, borderRadius: 12, padding: 12, alignItems: 'center', maxWidth: '46%' },
  characterCardSelected: { borderWidth: 2, borderColor: COLORS.primary },
  characterCardLocked: { opacity: 0.6 },
  characterCardIcon: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  characterCardName: { fontSize: 12, fontWeight: '600', color: COLORS.text },
  characterCardPrice: { fontSize: 10, color: COLORS.textLight, marginTop: 2 },
  selectedBadge: { position: 'absolute', top: 5, right: 5, width: 18, height: 18, borderRadius: 9, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  shopCoins: { flexDirection: 'row', alignItems: 'center' },
  shopCoinsText: { fontSize: 14, fontWeight: 'bold', color: COLORS.text, marginLeft: 4 },
  shopContent: { padding: 14 },
  shopSection: { fontSize: 14, fontWeight: 'bold', color: COLORS.text, marginTop: 14, marginBottom: 8 },
  shopItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, borderRadius: 10, padding: 10, marginBottom: 6 },
  shopItemIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  shopItemInfo: { flex: 1, marginLeft: 10 },
  shopItemName: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  shopItemPrice: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.background, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 10 },
  shopItemPriceDisabled: { opacity: 0.5 },
  shopItemPriceText: { fontSize: 12, fontWeight: '600', color: COLORS.gold, marginLeft: 3 },
  emptyShopText: { fontSize: 14, color: COLORS.textLight, textAlign: 'center', marginTop: 20 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 15, color: COLORS.textLight, marginTop: 10 },
  leaderboardItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, borderRadius: 10, padding: 10, marginBottom: 6 },
  leaderboardItemFirst: { borderWidth: 2, borderColor: COLORS.gold },
  leaderboardRank: { width: 32, alignItems: 'center' },
  rankNumber: { fontSize: 13, fontWeight: '600', color: COLORS.textLight },
  leaderboardChar: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  leaderboardInfo: { flex: 1 },
  leaderboardName: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  leaderboardStats: { fontSize: 10, color: COLORS.textLight },
});
