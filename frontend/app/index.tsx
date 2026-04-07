import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Modal,
  Platform,
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
  withRepeat,
  Easing,
  interpolate,
  withDelay,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

// Calming color palette
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
};

// Expanded board spaces - 24 spaces!
interface BoardSpace {
  id: number;
  type: 'start' | 'bonus' | 'lucky' | 'rest' | 'gift' | 'prize' | 'expense' | 'tax' | 'mystery' | 'jackpot' | 'toll' | 'shopping';
  name: string;
  icon: string;
  color: string;
  minAmount?: number;
  maxAmount?: number;
}

const BOARD_SPACES: BoardSpace[] = [
  { id: 0, type: 'start', name: 'Home Sweet Home', icon: 'home', color: COLORS.primary },
  { id: 1, type: 'bonus', name: 'Found Coins', icon: 'cash', color: COLORS.positive, minAmount: 15, maxAmount: 25 },
  { id: 2, type: 'rest', name: 'Peaceful Garden', icon: 'leaf', color: COLORS.purple },
  { id: 3, type: 'lucky', name: 'Lucky Clover', icon: 'star', color: COLORS.gold, minAmount: 10, maxAmount: 20 },
  { id: 4, type: 'expense', name: 'Coffee Break', icon: 'cafe', color: COLORS.accent, minAmount: 5, maxAmount: 12 },
  { id: 5, type: 'gift', name: 'Friend\'s Gift', icon: 'gift', color: COLORS.accentDark, minAmount: 20, maxAmount: 30 },
  { id: 6, type: 'toll', name: 'Toll Road', icon: 'car', color: COLORS.red, minAmount: 8, maxAmount: 15 },
  { id: 7, type: 'mystery', name: 'Mystery Box', icon: 'help-circle', color: COLORS.purple, minAmount: -15, maxAmount: 35 },
  { id: 8, type: 'bonus', name: 'Street Performance', icon: 'musical-notes', color: COLORS.positive, minAmount: 12, maxAmount: 22 },
  { id: 9, type: 'tax', name: 'Small Tax', icon: 'document-text', color: COLORS.orange, minAmount: 10, maxAmount: 18 },
  { id: 10, type: 'rest', name: 'Sunny Meadow', icon: 'sunny', color: COLORS.gold },
  { id: 11, type: 'prize', name: 'Mini Jackpot!', icon: 'trophy', color: COLORS.gold, minAmount: 30, maxAmount: 45 },
  { id: 12, type: 'shopping', name: 'Shopping Spree', icon: 'cart', color: COLORS.pink, minAmount: 12, maxAmount: 20 },
  { id: 13, type: 'lucky', name: 'Wishing Well', icon: 'water', color: COLORS.blue, minAmount: 15, maxAmount: 28 },
  { id: 14, type: 'expense', name: 'Movie Night', icon: 'film', color: COLORS.accent, minAmount: 8, maxAmount: 14 },
  { id: 15, type: 'gift', name: 'Birthday Card', icon: 'mail', color: COLORS.pink, minAmount: 18, maxAmount: 28 },
  { id: 16, type: 'toll', name: 'Parking Fee', icon: 'bus', color: COLORS.red, minAmount: 6, maxAmount: 12 },
  { id: 17, type: 'mystery', name: 'Surprise Event', icon: 'sparkles', color: COLORS.purple, minAmount: -20, maxAmount: 40 },
  { id: 18, type: 'bonus', name: 'Yard Sale', icon: 'pricetag', color: COLORS.positive, minAmount: 10, maxAmount: 18 },
  { id: 19, type: 'rest', name: 'Beach Day', icon: 'umbrella', color: COLORS.teal },
  { id: 20, type: 'tax', name: 'Utility Bill', icon: 'flash', color: COLORS.orange, minAmount: 8, maxAmount: 15 },
  { id: 21, type: 'jackpot', name: 'JACKPOT!', icon: 'diamond', color: COLORS.gold, minAmount: 50, maxAmount: 75 },
  { id: 22, type: 'shopping', name: 'Snack Run', icon: 'pizza', color: COLORS.pink, minAmount: 5, maxAmount: 10 },
  { id: 23, type: 'lucky', name: 'Rainbow End', icon: 'rainbow', color: COLORS.purple, minAmount: 20, maxAmount: 35 },
];

const TOTAL_SPACES = BOARD_SPACES.length;
const STARTING_MONEY = 50;
const GOAL_MONEY = 200;

// Character definitions
interface Character {
  id: string;
  name: string;
  icon: string;
  color: string;
  winsRequired: number;
}

const CHARACTERS: Character[] = [
  { id: 'sunny', name: 'Sunny', icon: 'sunny', color: '#FFD54F', winsRequired: 0 },
  { id: 'leaf', name: 'Leaf', icon: 'leaf', color: '#8BC34A', winsRequired: 0 },
  { id: 'star', name: 'Star', icon: 'star', color: '#7CB9A8', winsRequired: 1 },
  { id: 'heart', name: 'Heart', icon: 'heart', color: '#E8B4A2', winsRequired: 2 },
  { id: 'diamond', name: 'Diamond', icon: 'diamond', color: '#B39DDB', winsRequired: 3 },
  { id: 'rocket', name: 'Rocket', icon: 'rocket', color: '#64B5F6', winsRequired: 5 },
  { id: 'flash', name: 'Flash', icon: 'flash', color: '#FFB74D', winsRequired: 7 },
  { id: 'planet', name: 'Planet', icon: 'planet', color: '#4DB6AC', winsRequired: 10 },
  { id: 'trophy', name: 'Champion', icon: 'trophy', color: '#FFC107', winsRequired: 15 },
  { id: 'crown', name: 'Royal', icon: 'sparkles', color: '#9C27B0', winsRequired: 20 },
];

const getRandomAmount = (min: number, max: number) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// Sound manager
class SoundManager {
  private sounds: { [key: string]: Audio.Sound | null } = {};
  private enabled: boolean = true;

  async initialize() {
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });
    } catch (e) {
      console.log('Audio init error:', e);
    }
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  async playDiceRoll() {
    if (!this.enabled) return;
    // Simple beep sound effect simulation through haptics-like feedback
    // In a real app, you'd load actual sound files
  }

  async playWin() {
    if (!this.enabled) return;
  }

  async playMoney() {
    if (!this.enabled) return;
  }

  async playLoss() {
    if (!this.enabled) return;
  }
}

const soundManager = new SoundManager();

export default function EasyStreet() {
  // Game state
  const [money, setMoney] = useState(STARTING_MONEY);
  const [position, setPosition] = useState(0);
  const [diceValue, setDiceValue] = useState(1);
  const [isRolling, setIsRolling] = useState(false);
  const [showEvent, setShowEvent] = useState(false);
  const [eventText, setEventText] = useState('');
  const [eventAmount, setEventAmount] = useState(0);
  const [hasWon, setHasWon] = useState(false);
  const [turnCount, setTurnCount] = useState(0);
  
  // UI state
  const [currentScreen, setCurrentScreen] = useState<'welcome' | 'game' | 'leaderboard' | 'characters' | 'win'>('welcome');
  const [playerName, setPlayerName] = useState('');
  const [playerId, setPlayerId] = useState('');
  const [gameId, setGameId] = useState('');
  const [selectedCharacter, setSelectedCharacter] = useState<Character>(CHARACTERS[0]);
  const [unlockedCharacters, setUnlockedCharacters] = useState<string[]>(['sunny', 'leaf']);
  const [totalWins, setTotalWins] = useState(0);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [newlyUnlocked, setNewlyUnlocked] = useState<string[]>([]);
  const [showUnlockModal, setShowUnlockModal] = useState(false);

  // Animation values
  const diceRotation = useSharedValue(0);
  const diceScale = useSharedValue(1);
  const playerScale = useSharedValue(1);
  const moneyGlow = useSharedValue(0);
  const eventOpacity = useSharedValue(0);

  // Initialize
  useEffect(() => {
    soundManager.initialize();
    loadLocalData();
  }, []);

  useEffect(() => {
    soundManager.setEnabled(soundEnabled);
  }, [soundEnabled]);

  const loadLocalData = async () => {
    try {
      const savedPlayerId = await AsyncStorage.getItem('easystreet_player_id');
      const savedPlayerName = await AsyncStorage.getItem('easystreet_player_name');
      const savedCharacter = await AsyncStorage.getItem('easystreet_character');
      const savedWins = await AsyncStorage.getItem('easystreet_wins');
      const savedUnlocked = await AsyncStorage.getItem('easystreet_unlocked');
      
      if (savedPlayerId) setPlayerId(savedPlayerId);
      if (savedPlayerName) setPlayerName(savedPlayerName);
      if (savedWins) setTotalWins(parseInt(savedWins));
      if (savedUnlocked) setUnlockedCharacters(JSON.parse(savedUnlocked));
      if (savedCharacter) {
        const char = CHARACTERS.find(c => c.id === savedCharacter);
        if (char) setSelectedCharacter(char);
      }
      
      // Check for existing game
      if (savedPlayerId) {
        await loadCloudGame(savedPlayerId);
      }
    } catch (error) {
      console.log('Error loading local data:', error);
    }
  };

  const loadCloudGame = async (pid: string) => {
    try {
      const response = await fetch(`${API_URL}/api/games/${pid}`);
      if (response.ok) {
        const game = await response.json();
        if (game && !game.is_completed) {
          setMoney(game.money);
          setPosition(game.position);
          setTurnCount(game.turn_count);
          setGameId(game.id);
        }
      }
    } catch (error) {
      console.log('Error loading cloud game:', error);
    }
  };

  const saveLocalData = async () => {
    try {
      await AsyncStorage.setItem('easystreet_player_id', playerId);
      await AsyncStorage.setItem('easystreet_player_name', playerName);
      await AsyncStorage.setItem('easystreet_character', selectedCharacter.id);
      await AsyncStorage.setItem('easystreet_wins', totalWins.toString());
      await AsyncStorage.setItem('easystreet_unlocked', JSON.stringify(unlockedCharacters));
    } catch (error) {
      console.log('Error saving local data:', error);
    }
  };

  const saveCloudGame = async () => {
    if (!gameId) return;
    try {
      await fetch(`${API_URL}/api/games/${gameId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          money,
          position,
          turn_count: turnCount,
          is_completed: false,
        }),
      });
    } catch (error) {
      console.log('Error saving cloud game:', error);
    }
  };

  // Save game state when it changes
  useEffect(() => {
    if (currentScreen === 'game' && gameId && !hasWon) {
      saveCloudGame();
    }
  }, [money, position, turnCount]);

  const fetchLeaderboard = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/leaderboard?limit=20`);
      if (response.ok) {
        const data = await response.json();
        setLeaderboard(data);
      }
    } catch (error) {
      console.log('Error fetching leaderboard:', error);
    }
    setIsLoading(false);
  };

  const startNewGame = async () => {
    if (!playerName.trim()) {
      setPlayerName('Player');
    }
    
    const name = playerName.trim() || 'Player';
    let pid = playerId;
    
    // Create player ID if not exists
    if (!pid) {
      pid = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setPlayerId(pid);
    }
    
    // Reset game state
    setMoney(STARTING_MONEY);
    setPosition(0);
    setTurnCount(0);
    setHasWon(false);
    
    // Create cloud game
    try {
      const response = await fetch(`${API_URL}/api/games`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player_id: pid,
          player_name: name,
          character: selectedCharacter.id,
        }),
      });
      
      if (response.ok) {
        const game = await response.json();
        setGameId(game.id);
      }
    } catch (error) {
      console.log('Error creating cloud game:', error);
      // Generate local game ID
      setGameId(`local_${Date.now()}`);
    }
    
    await saveLocalData();
    setCurrentScreen('game');
  };

  const handleWin = async () => {
    setHasWon(true);
    soundManager.playWin();
    
    // Update cloud game as completed
    if (gameId) {
      try {
        await fetch(`${API_URL}/api/games/${gameId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            money,
            position,
            turn_count: turnCount,
            is_completed: true,
          }),
        });
        
        // Record win and check for unlocks
        if (playerId) {
          const response = await fetch(`${API_URL}/api/profiles/${playerId}/record-win?turns=${turnCount}`, {
            method: 'POST',
          });
          
          if (response.ok) {
            const data = await response.json();
            const newWins = data.total_wins || totalWins + 1;
            setTotalWins(newWins);
            
            // Check for newly unlocked characters
            if (data.newly_unlocked && data.newly_unlocked.length > 0) {
              setNewlyUnlocked(data.newly_unlocked);
              setUnlockedCharacters(data.all_unlocked || [...unlockedCharacters, ...data.newly_unlocked]);
              setTimeout(() => setShowUnlockModal(true), 1500);
            }
          } else {
            // Fallback to local win tracking
            const newWins = totalWins + 1;
            setTotalWins(newWins);
            checkLocalUnlocks(newWins);
          }
        }
      } catch (error) {
        console.log('Error recording win:', error);
        // Fallback to local
        const newWins = totalWins + 1;
        setTotalWins(newWins);
        checkLocalUnlocks(newWins);
      }
    } else {
      const newWins = totalWins + 1;
      setTotalWins(newWins);
      checkLocalUnlocks(newWins);
    }
    
    await saveLocalData();
    setCurrentScreen('win');
  };

  const checkLocalUnlocks = (wins: number) => {
    const newUnlocks: string[] = [];
    CHARACTERS.forEach(char => {
      if (!unlockedCharacters.includes(char.id) && char.winsRequired <= wins) {
        newUnlocks.push(char.id);
      }
    });
    
    if (newUnlocks.length > 0) {
      setNewlyUnlocked(newUnlocks);
      setUnlockedCharacters([...unlockedCharacters, ...newUnlocks]);
      setTimeout(() => setShowUnlockModal(true), 1500);
    }
  };

  const handleSpaceEvent = useCallback((newPosition: number, currentMoney: number) => {
    const space = BOARD_SPACES[newPosition];
    let amountChange = 0;
    let text = '';

    switch (space.type) {
      case 'start':
        text = 'Welcome home! Take a rest.';
        break;
      case 'bonus':
      case 'lucky':
      case 'gift':
      case 'prize':
      case 'jackpot':
        amountChange = getRandomAmount(space.minAmount || 10, space.maxAmount || 20);
        text = `${space.name}! +$${amountChange}`;
        soundManager.playMoney();
        break;
      case 'expense':
      case 'tax':
      case 'toll':
      case 'shopping':
        amountChange = -getRandomAmount(space.minAmount || 5, space.maxAmount || 10);
        text = `${space.name}! -$${Math.abs(amountChange)}`;
        soundManager.playLoss();
        break;
      case 'mystery':
        amountChange = getRandomAmount(space.minAmount || -15, space.maxAmount || 35);
        if (amountChange >= 0) {
          text = `${space.name}: Lucky! +$${amountChange}`;
          soundManager.playMoney();
        } else {
          text = `${space.name}: Oops! -$${Math.abs(amountChange)}`;
          soundManager.playLoss();
        }
        break;
      case 'rest':
        text = `${space.name} - What a nice view!`;
        break;
    }

    setEventText(text);
    setEventAmount(amountChange);
    setShowEvent(true);

    eventOpacity.value = withSequence(
      withTiming(1, { duration: 300 }),
      withTiming(1, { duration: 2000 }),
      withTiming(0, { duration: 500 })
    );

    const finalMoney = Math.max(0, currentMoney + amountChange);
    setMoney(finalMoney);

    // Check win condition
    if (finalMoney >= GOAL_MONEY) {
      setTimeout(() => {
        handleWin();
      }, 1500);
    }

    setTimeout(() => {
      setShowEvent(false);
    }, 3000);

    // Animate money if changed
    if (amountChange !== 0) {
      moneyGlow.value = withSequence(
        withTiming(1, { duration: 300 }),
        withTiming(0, { duration: 500 })
      );
    }
  }, [totalWins, unlockedCharacters, gameId, playerId]);

  const rollDice = useCallback(() => {
    if (isRolling) return;

    setIsRolling(true);
    soundManager.playDiceRoll();

    // Dice roll animation
    diceScale.value = withSequence(
      withSpring(1.3, { damping: 10 }),
      withSpring(1, { damping: 8 })
    );

    diceRotation.value = withRepeat(
      withTiming(360, { duration: 150, easing: Easing.linear }),
      4,
      false
    );

    // Generate dice value after animation
    setTimeout(() => {
      const roll = Math.floor(Math.random() * 6) + 1;
      setDiceValue(roll);
      diceRotation.value = 0;

      // Move player
      const newPosition = (position + roll) % TOTAL_SPACES;
      
      // Animate player movement
      playerScale.value = withSequence(
        withTiming(1.2, { duration: 200 }),
        withTiming(1, { duration: 200 })
      );

      setTimeout(() => {
        setPosition(newPosition);
        setTurnCount(prev => prev + 1);
        setIsRolling(false);
        handleSpaceEvent(newPosition, money);
      }, 400);
    }, 600);
  }, [isRolling, position, money, handleSpaceEvent]);

  const diceAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${diceRotation.value}deg` },
      { scale: diceScale.value }
    ],
  }));

  const moneyAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(moneyGlow.value, [0, 1], [1, 1.1]) }],
  }));

  const eventAnimatedStyle = useAnimatedStyle(() => ({
    opacity: eventOpacity.value,
    transform: [{ translateY: interpolate(eventOpacity.value, [0, 1], [20, 0]) }],
  }));

  // Render board space
  const renderBoardSpace = (space: BoardSpace, index: number) => {
    const isCurrentPosition = position === index;
    const angle = (index / TOTAL_SPACES) * 2 * Math.PI - Math.PI / 2;
    const boardSize = Math.min(SCREEN_WIDTH - 40, 380);
    const radius = boardSize * 0.38;
    const centerX = boardSize / 2 - 22;
    const centerY = boardSize / 2 - 22;
    
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);

    return (
      <View
        key={space.id}
        style={[
          styles.boardSpace,
          {
            left: x,
            top: y,
            backgroundColor: space.color,
            borderWidth: isCurrentPosition ? 3 : 0,
            borderColor: COLORS.text,
            transform: isCurrentPosition ? [{ scale: 1.2 }] : [],
          },
        ]}
      >
        <Ionicons
          name={space.icon as any}
          size={18}
          color={COLORS.white}
        />
        {isCurrentPosition && (
          <View style={[styles.playerIndicator, { backgroundColor: selectedCharacter.color }]}>
            <Ionicons name={selectedCharacter.icon as any} size={12} color={COLORS.white} />
          </View>
        )}
      </View>
    );
  };

  // Dice face component
  const renderDiceFace = (value: number) => {
    const dotPositions: Record<number, number[][]> = {
      1: [[50, 50]],
      2: [[25, 25], [75, 75]],
      3: [[25, 25], [50, 50], [75, 75]],
      4: [[25, 25], [75, 25], [25, 75], [75, 75]],
      5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
      6: [[25, 25], [75, 25], [25, 50], [75, 50], [25, 75], [75, 75]],
    };

    return (
      <View style={styles.diceInner}>
        {dotPositions[value].map((pos, i) => (
          <View
            key={i}
            style={[
              styles.diceDot,
              {
                left: `${pos[0]}%`,
                top: `${pos[1]}%`,
              },
            ]}
          />
        ))}
      </View>
    );
  };

  // Welcome Screen
  const renderWelcomeScreen = () => (
    <ScrollView contentContainerStyle={styles.welcomeContainer}>
      <Ionicons name="leaf" size={70} color={COLORS.primary} />
      <Text style={styles.welcomeTitle}>Easy Street</Text>
      <Text style={styles.welcomeSubtitle}>A calm journey to ${GOAL_MONEY}</Text>
      
      <View style={styles.welcomeInfo}>
        <Text style={styles.welcomeText}>
          Roll the dice, move around the board, and collect money. 
          Win games to unlock new characters!
        </Text>
      </View>

      {/* Player Name Input */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Your Name</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Enter your name"
          placeholderTextColor={COLORS.textLight}
          value={playerName}
          onChangeText={setPlayerName}
          maxLength={20}
        />
      </View>

      {/* Character Selection */}
      <TouchableOpacity
        style={styles.characterSelectButton}
        onPress={() => setCurrentScreen('characters')}
        activeOpacity={0.8}
      >
        <View style={[styles.characterIcon, { backgroundColor: selectedCharacter.color }]}>
          <Ionicons name={selectedCharacter.icon as any} size={24} color={COLORS.white} />
        </View>
        <View style={styles.characterSelectText}>
          <Text style={styles.characterSelectLabel}>Playing as</Text>
          <Text style={styles.characterSelectName}>{selectedCharacter.name}</Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color={COLORS.textLight} />
      </TouchableOpacity>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{totalWins}</Text>
          <Text style={styles.statLabel}>Wins</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{unlockedCharacters.length}/{CHARACTERS.length}</Text>
          <Text style={styles.statLabel}>Characters</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.startButton}
        onPress={startNewGame}
        activeOpacity={0.8}
      >
        <Ionicons name="play" size={24} color={COLORS.white} />
        <Text style={styles.startButtonText}>Start Game</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.leaderboardButton}
        onPress={() => { fetchLeaderboard(); setCurrentScreen('leaderboard'); }}
        activeOpacity={0.8}
      >
        <Ionicons name="trophy" size={20} color={COLORS.gold} />
        <Text style={styles.leaderboardButtonText}>Leaderboard</Text>
      </TouchableOpacity>

      {/* Sound Toggle */}
      <TouchableOpacity
        style={styles.soundToggle}
        onPress={() => setSoundEnabled(!soundEnabled)}
      >
        <Ionicons 
          name={soundEnabled ? 'volume-high' : 'volume-mute'} 
          size={20} 
          color={COLORS.textLight} 
        />
      </TouchableOpacity>
    </ScrollView>
  );

  // Character Selection Screen
  const renderCharacterScreen = () => (
    <View style={styles.screenContainer}>
      <View style={styles.screenHeader}>
        <TouchableOpacity onPress={() => setCurrentScreen('welcome')}>
          <Ionicons name="arrow-back" size={28} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Choose Character</Text>
        <View style={{ width: 28 }} />
      </View>

      <Text style={styles.screenSubtitle}>Win games to unlock more characters!</Text>

      <FlatList
        data={CHARACTERS}
        numColumns={2}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.characterGrid}
        renderItem={({ item }) => {
          const isUnlocked = unlockedCharacters.includes(item.id);
          const isSelected = selectedCharacter.id === item.id;
          
          return (
            <TouchableOpacity
              style={[
                styles.characterCard,
                isSelected && styles.characterCardSelected,
                !isUnlocked && styles.characterCardLocked,
              ]}
              onPress={() => {
                if (isUnlocked) {
                  setSelectedCharacter(item);
                }
              }}
              activeOpacity={isUnlocked ? 0.7 : 1}
            >
              <View style={[
                styles.characterCardIcon,
                { backgroundColor: isUnlocked ? item.color : COLORS.textLight }
              ]}>
                <Ionicons 
                  name={isUnlocked ? item.icon as any : 'lock-closed'} 
                  size={32} 
                  color={COLORS.white} 
                />
              </View>
              <Text style={styles.characterCardName}>
                {isUnlocked ? item.name : '???'}
              </Text>
              {!isUnlocked && (
                <Text style={styles.characterCardUnlock}>
                  {item.winsRequired} wins
                </Text>
              )}
              {isSelected && (
                <View style={styles.selectedBadge}>
                  <Ionicons name="checkmark" size={14} color={COLORS.white} />
                </View>
              )}
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );

  // Leaderboard Screen
  const renderLeaderboardScreen = () => (
    <View style={styles.screenContainer}>
      <View style={styles.screenHeader}>
        <TouchableOpacity onPress={() => setCurrentScreen('welcome')}>
          <Ionicons name="arrow-back" size={28} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Leaderboard</Text>
        <TouchableOpacity onPress={fetchLeaderboard}>
          <Ionicons name="refresh" size={24} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <Text style={styles.screenSubtitle}>Top players by fewest turns</Text>

      {isLoading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : leaderboard.length === 0 ? (
        <View style={styles.emptyLeaderboard}>
          <Ionicons name="trophy-outline" size={60} color={COLORS.textLight} />
          <Text style={styles.emptyText}>No winners yet!</Text>
          <Text style={styles.emptySubtext}>Be the first to reach ${GOAL_MONEY}</Text>
        </View>
      ) : (
        <FlatList
          data={leaderboard}
          keyExtractor={(item, index) => `${item.player_id}_${index}`}
          contentContainerStyle={styles.leaderboardList}
          renderItem={({ item, index }) => {
            const char = CHARACTERS.find(c => c.id === item.character) || CHARACTERS[0];
            return (
              <View style={[
                styles.leaderboardItem,
                index === 0 && styles.leaderboardItemFirst,
              ]}>
                <View style={styles.leaderboardRank}>
                  {index < 3 ? (
                    <Ionicons 
                      name="trophy" 
                      size={24} 
                      color={index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : '#CD7F32'} 
                    />
                  ) : (
                    <Text style={styles.rankNumber}>#{index + 1}</Text>
                  )}
                </View>
                <View style={[styles.leaderboardCharacter, { backgroundColor: char.color }]}>
                  <Ionicons name={char.icon as any} size={18} color={COLORS.white} />
                </View>
                <View style={styles.leaderboardInfo}>
                  <Text style={styles.leaderboardName}>{item.player_name}</Text>
                  <Text style={styles.leaderboardStats}>
                    {item.turn_count} turns • ${item.final_money}
                  </Text>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );

  // Game Screen
  const renderGameScreen = () => (
    <ScrollView 
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => setCurrentScreen('welcome')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.turnText}>Turn {turnCount}</Text>
        </View>
        <Animated.View style={[styles.moneyContainer, moneyAnimatedStyle]}>
          <Ionicons name="cash" size={20} color={COLORS.positive} />
          <Text style={styles.moneyText}>${money}</Text>
        </Animated.View>
      </View>

      {/* Progress bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${Math.min(100, (money / GOAL_MONEY) * 100)}%` },
            ]}
          />
        </View>
        <Text style={styles.progressText}>Goal: ${GOAL_MONEY}</Text>
      </View>

      {/* Game Board */}
      <View style={styles.boardContainer}>
        <View style={styles.board}>
          {BOARD_SPACES.map((space, index) => renderBoardSpace(space, index))}
          
          {/* Center area */}
          <View style={styles.boardCenter}>
            <Text style={styles.boardCenterTitle}>Easy Street</Text>
            <View style={[styles.centerCharacter, { backgroundColor: selectedCharacter.color }]}>
              <Ionicons name={selectedCharacter.icon as any} size={24} color={COLORS.white} />
            </View>
          </View>
        </View>
      </View>

      {/* Current space info */}
      <View style={styles.spaceInfo}>
        <Ionicons
          name={BOARD_SPACES[position].icon as any}
          size={22}
          color={BOARD_SPACES[position].color}
        />
        <Text style={styles.spaceInfoText}>{BOARD_SPACES[position].name}</Text>
      </View>

      {/* Dice and Roll Button */}
      <View style={styles.diceSection}>
        <Animated.View style={[styles.dice, diceAnimatedStyle]}>
          {renderDiceFace(diceValue)}
        </Animated.View>

        <TouchableOpacity
          style={[
            styles.rollButton,
            isRolling && styles.rollButtonDisabled,
          ]}
          onPress={rollDice}
          disabled={isRolling}
          activeOpacity={0.8}
        >
          <Ionicons
            name={isRolling ? 'hourglass' : 'dice'}
            size={22}
            color={COLORS.white}
          />
          <Text style={styles.rollButtonText}>
            {isRolling ? 'Rolling...' : 'Roll Dice'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Event popup */}
      {showEvent && (
        <Animated.View style={[styles.eventPopup, eventAnimatedStyle]}>
          <Text style={[
            styles.eventText,
            { color: eventAmount >= 0 ? COLORS.positive : COLORS.negative }
          ]}>
            {eventText}
          </Text>
        </Animated.View>
      )}
    </ScrollView>
  );

  // Win Screen
  const renderWinScreen = () => (
    <View style={styles.winContainer}>
      <Ionicons name="trophy" size={80} color={COLORS.gold} />
      <Text style={styles.winTitle}>Congratulations!</Text>
      <Text style={styles.winSubtitle}>You reached ${money}!</Text>
      <Text style={styles.winTurns}>Completed in {turnCount} turns</Text>
      
      <View style={styles.winStatsRow}>
        <View style={styles.winStatBox}>
          <Text style={styles.winStatValue}>{totalWins}</Text>
          <Text style={styles.winStatLabel}>Total Wins</Text>
        </View>
        <View style={styles.winStatBox}>
          <Text style={styles.winStatValue}>{unlockedCharacters.length}</Text>
          <Text style={styles.winStatLabel}>Characters</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.startButton}
        onPress={startNewGame}
        activeOpacity={0.8}
      >
        <Ionicons name="refresh" size={24} color={COLORS.white} />
        <Text style={styles.startButtonText}>Play Again</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.leaderboardButton}
        onPress={() => { fetchLeaderboard(); setCurrentScreen('leaderboard'); }}
        activeOpacity={0.8}
      >
        <Ionicons name="trophy" size={20} color={COLORS.gold} />
        <Text style={styles.leaderboardButtonText}>View Leaderboard</Text>
      </TouchableOpacity>
    </View>
  );

  // Character Unlock Modal
  const renderUnlockModal = () => (
    <Modal
      visible={showUnlockModal}
      transparent
      animationType="fade"
    >
      <View style={styles.modalOverlay}>
        <View style={styles.unlockModal}>
          <Ionicons name="sparkles" size={50} color={COLORS.gold} />
          <Text style={styles.unlockTitle}>New Character{newlyUnlocked.length > 1 ? 's' : ''} Unlocked!</Text>
          
          <View style={styles.unlockedCharacters}>
            {newlyUnlocked.map(charId => {
              const char = CHARACTERS.find(c => c.id === charId);
              if (!char) return null;
              return (
                <View key={charId} style={styles.unlockedCharacter}>
                  <View style={[styles.unlockedCharIcon, { backgroundColor: char.color }]}>
                    <Ionicons name={char.icon as any} size={32} color={COLORS.white} />
                  </View>
                  <Text style={styles.unlockedCharName}>{char.name}</Text>
                </View>
              );
            })}
          </View>

          <TouchableOpacity
            style={styles.unlockCloseButton}
            onPress={() => { setShowUnlockModal(false); setNewlyUnlocked([]); }}
          >
            <Text style={styles.unlockCloseText}>Awesome!</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      {currentScreen === 'welcome' && renderWelcomeScreen()}
      {currentScreen === 'game' && renderGameScreen()}
      {currentScreen === 'characters' && renderCharacterScreen()}
      {currentScreen === 'leaderboard' && renderLeaderboardScreen()}
      {currentScreen === 'win' && renderWinScreen()}
      {renderUnlockModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  screenContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  screenHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  screenSubtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  turnText: {
    fontSize: 16,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  moneyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 3,
  },
  moneyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginLeft: 6,
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressBar: {
    height: 10,
    backgroundColor: COLORS.boardBg,
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 5,
  },
  progressText: {
    fontSize: 12,
    color: COLORS.textLight,
    textAlign: 'right',
    marginTop: 4,
  },
  boardContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  board: {
    width: Math.min(SCREEN_WIDTH - 40, 380),
    height: Math.min(SCREEN_WIDTH - 40, 380),
    backgroundColor: COLORS.boardBg,
    borderRadius: Math.min(SCREEN_WIDTH - 40, 380) / 2,
    position: 'relative',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 5,
  },
  boardSpace: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 3,
    elevation: 2,
  },
  playerIndicator: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  boardCenter: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -45 }, { translateY: -40 }],
    width: 90,
    alignItems: 'center',
  },
  boardCenterTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 6,
  },
  centerCharacter: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spaceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    marginBottom: 16,
    alignSelf: 'center',
  },
  spaceInfoText: {
    fontSize: 14,
    color: COLORS.text,
    marginLeft: 8,
    fontWeight: '500',
  },
  diceSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 16,
  },
  dice: {
    width: 60,
    height: 60,
    backgroundColor: COLORS.white,
    borderRadius: 10,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 5,
    elevation: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  diceInner: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  diceDot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.text,
    transform: [{ translateX: -5 }, { translateY: -5 }],
  },
  rollButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 25,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 5,
    elevation: 4,
  },
  rollButtonDisabled: {
    backgroundColor: COLORS.textLight,
  },
  rollButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.white,
    marginLeft: 8,
  },
  eventPopup: {
    position: 'absolute',
    top: '40%',
    left: 16,
    right: 16,
    backgroundColor: COLORS.white,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 6,
  },
  eventText: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  // Welcome screen
  welcomeContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  welcomeTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 16,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: COLORS.textLight,
    marginTop: 6,
    marginBottom: 20,
  },
  welcomeInfo: {
    backgroundColor: COLORS.white,
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
    width: '100%',
  },
  welcomeText: {
    fontSize: 14,
    color: COLORS.text,
    textAlign: 'center',
    lineHeight: 22,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 6,
    marginLeft: 4,
  },
  textInput: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.boardBg,
  },
  characterSelectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
    width: '100%',
    marginBottom: 20,
  },
  characterIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  characterSelectText: {
    flex: 1,
    marginLeft: 12,
  },
  characterSelectLabel: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  characterSelectName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 24,
    gap: 16,
  },
  statBox: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 4,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 25,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 5,
    elevation: 4,
    marginBottom: 16,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
    marginLeft: 8,
  },
  leaderboardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  leaderboardButtonText: {
    fontSize: 16,
    color: COLORS.text,
    marginLeft: 8,
    fontWeight: '500',
  },
  soundToggle: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 8,
  },
  // Character screen
  characterGrid: {
    paddingBottom: 20,
  },
  characterCard: {
    flex: 1,
    margin: 8,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    maxWidth: '46%',
  },
  characterCardSelected: {
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  characterCardLocked: {
    opacity: 0.6,
  },
  characterCardIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  characterCardName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  characterCardUnlock: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 4,
  },
  selectedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Leaderboard
  emptyLeaderboard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 6,
  },
  leaderboardList: {
    paddingBottom: 20,
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  leaderboardItemFirst: {
    borderWidth: 2,
    borderColor: COLORS.gold,
  },
  leaderboardRank: {
    width: 40,
    alignItems: 'center',
  },
  rankNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textLight,
  },
  leaderboardCharacter: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  leaderboardInfo: {
    flex: 1,
  },
  leaderboardName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  leaderboardStats: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
  },
  // Win screen
  winContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  winTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.gold,
    marginTop: 16,
  },
  winSubtitle: {
    fontSize: 20,
    color: COLORS.text,
    marginTop: 8,
  },
  winTurns: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 6,
    marginBottom: 24,
  },
  winStatsRow: {
    flexDirection: 'row',
    marginBottom: 32,
    gap: 16,
  },
  winStatBox: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    minWidth: 100,
  },
  winStatValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  winStatLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 4,
  },
  // Unlock modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  unlockModal: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
  },
  unlockTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 12,
    marginBottom: 20,
  },
  unlockedCharacters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 24,
  },
  unlockedCharacter: {
    alignItems: 'center',
  },
  unlockedCharIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  unlockedCharName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  unlockCloseButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 20,
  },
  unlockCloseText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.white,
  },
});
