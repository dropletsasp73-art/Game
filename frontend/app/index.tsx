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
  runOnJS,
  interpolate,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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
};

// Board space types with calming themes
interface BoardSpace {
  id: number;
  type: 'start' | 'bonus' | 'lucky' | 'rest' | 'gift' | 'prize' | 'expense';
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
  { id: 4, type: 'expense', name: 'Coffee Break', icon: 'cafe', color: COLORS.accent, minAmount: 5, maxAmount: 10 },
  { id: 5, type: 'gift', name: 'Friend\'s Gift', icon: 'gift', color: COLORS.accentDark, minAmount: 20, maxAmount: 30 },
  { id: 6, type: 'rest', name: 'Sunny Meadow', icon: 'sunny', color: COLORS.gold },
  { id: 7, type: 'prize', name: 'Jackpot!', icon: 'trophy', color: COLORS.gold, minAmount: 35, maxAmount: 50 },
  { id: 8, type: 'bonus', name: 'Loose Change', icon: 'wallet', color: COLORS.positive, minAmount: 10, maxAmount: 20 },
  { id: 9, type: 'expense', name: 'Snack Time', icon: 'pizza', color: COLORS.accent, minAmount: 5, maxAmount: 8 },
  { id: 10, type: 'lucky', name: 'Rainbow Path', icon: 'rainbow', color: COLORS.purple, minAmount: 15, maxAmount: 25 },
  { id: 11, type: 'gift', name: 'Surprise Box', icon: 'cube', color: COLORS.primary, minAmount: 15, maxAmount: 25 },
];

const TOTAL_SPACES = BOARD_SPACES.length;
const STARTING_MONEY = 50;
const GOAL_MONEY = 200;

const getRandomAmount = (min: number, max: number) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

export default function EasyStreet() {
  const [money, setMoney] = useState(STARTING_MONEY);
  const [position, setPosition] = useState(0);
  const [diceValue, setDiceValue] = useState(1);
  const [isRolling, setIsRolling] = useState(false);
  const [showEvent, setShowEvent] = useState(false);
  const [eventText, setEventText] = useState('');
  const [eventAmount, setEventAmount] = useState(0);
  const [hasWon, setHasWon] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [turnCount, setTurnCount] = useState(0);

  // Animation values
  const diceRotation = useSharedValue(0);
  const diceScale = useSharedValue(1);
  const playerScale = useSharedValue(1);
  const moneyGlow = useSharedValue(0);
  const eventOpacity = useSharedValue(0);

  // Load saved game on mount
  useEffect(() => {
    loadGame();
  }, []);

  // Save game whenever state changes
  useEffect(() => {
    if (!showWelcome && !hasWon) {
      saveGame();
    }
  }, [money, position, turnCount]);

  const loadGame = async () => {
    try {
      const savedGame = await AsyncStorage.getItem('easystreet_game');
      if (savedGame) {
        const data = JSON.parse(savedGame);
        setMoney(data.money || STARTING_MONEY);
        setPosition(data.position || 0);
        setTurnCount(data.turnCount || 0);
        setShowWelcome(false);
      }
    } catch (error) {
      console.log('No saved game found');
    }
  };

  const saveGame = async () => {
    try {
      await AsyncStorage.setItem('easystreet_game', JSON.stringify({
        money,
        position,
        turnCount,
      }));
    } catch (error) {
      console.log('Error saving game');
    }
  };

  const startNewGame = async () => {
    setMoney(STARTING_MONEY);
    setPosition(0);
    setTurnCount(0);
    setHasWon(false);
    setShowWelcome(false);
    await AsyncStorage.removeItem('easystreet_game');
  };

  const continueGame = () => {
    setShowWelcome(false);
  };

  const handleSpaceEvent = useCallback((newPosition: number, newMoney: number) => {
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
        amountChange = getRandomAmount(space.minAmount || 10, space.maxAmount || 20);
        text = `${space.name}! +$${amountChange}`;
        break;
      case 'expense':
        amountChange = -getRandomAmount(space.minAmount || 5, space.maxAmount || 10);
        text = `${space.name}! $${amountChange}`;
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

    const finalMoney = newMoney + amountChange;
    setMoney(Math.max(0, finalMoney));

    // Check win condition
    if (finalMoney >= GOAL_MONEY) {
      setTimeout(() => {
        setHasWon(true);
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
  }, []);

  const rollDice = useCallback(() => {
    if (isRolling) return;

    setIsRolling(true);

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
    backgroundColor: moneyGlow.value > 0 ? COLORS.gold : COLORS.white,
  }));

  const eventAnimatedStyle = useAnimatedStyle(() => ({
    opacity: eventOpacity.value,
    transform: [{ translateY: interpolate(eventOpacity.value, [0, 1], [20, 0]) }],
  }));

  // Render board space
  const renderBoardSpace = (space: BoardSpace, index: number) => {
    const isCurrentPosition = position === index;
    const angle = (index / TOTAL_SPACES) * 2 * Math.PI - Math.PI / 2;
    const radius = Math.min(SCREEN_WIDTH, 400) * 0.32;
    const centerX = Math.min(SCREEN_WIDTH, 400) / 2 - 28;
    const centerY = Math.min(SCREEN_WIDTH, 400) / 2 - 28;
    
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);

    return (
      <Animated.View
        key={space.id}
        style={[
          styles.boardSpace,
          {
            left: x,
            top: y,
            backgroundColor: space.color,
            borderWidth: isCurrentPosition ? 3 : 0,
            borderColor: COLORS.text,
          },
          isCurrentPosition && {
            transform: [{ scale: 1.15 }],
          },
        ]}
      >
        <Ionicons
          name={space.icon as any}
          size={22}
          color={COLORS.white}
        />
        {isCurrentPosition && (
          <View style={styles.playerIndicator}>
            <Ionicons name="person" size={14} color={COLORS.white} />
          </View>
        )}
      </Animated.View>
    );
  };

  // Dice face component
  const renderDiceFace = (value: number) => {
    const dots: { top: string; left: string }[] = [];
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

  // Welcome/Start screen
  if (showWelcome) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.welcomeContainer}>
          <Ionicons name="leaf" size={80} color={COLORS.primary} />
          <Text style={styles.welcomeTitle}>Easy Street</Text>
          <Text style={styles.welcomeSubtitle}>A calm journey to $200</Text>
          
          <View style={styles.welcomeInfo}>
            <Text style={styles.welcomeText}>
              Roll the dice, move around the board, and collect money along the way.
              No stress, no rush - just enjoy the journey!
            </Text>
          </View>

          <TouchableOpacity
            style={styles.startButton}
            onPress={startNewGame}
            activeOpacity={0.8}
          >
            <Text style={styles.startButtonText}>Start New Game</Text>
          </TouchableOpacity>

          {turnCount > 0 && (
            <TouchableOpacity
              style={styles.continueButton}
              onPress={continueGame}
              activeOpacity={0.8}
            >
              <Text style={styles.continueButtonText}>Continue (${money})</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // Win screen
  if (hasWon) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.winContainer}>
          <Ionicons name="trophy" size={100} color={COLORS.gold} />
          <Text style={styles.winTitle}>Congratulations!</Text>
          <Text style={styles.winSubtitle}>You reached ${money}!</Text>
          <Text style={styles.winTurns}>Completed in {turnCount} turns</Text>
          
          <TouchableOpacity
            style={styles.startButton}
            onPress={startNewGame}
            activeOpacity={0.8}
          >
            <Text style={styles.startButtonText}>Play Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
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
              <Ionicons name="sunny" size={30} color={COLORS.gold} />
            </View>
          </View>
        </View>

        {/* Current space info */}
        <View style={styles.spaceInfo}>
          <Ionicons
            name={BOARD_SPACES[position].icon as any}
            size={24}
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
              size={24}
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

        {/* New Game Button */}
        <TouchableOpacity
          style={styles.newGameButton}
          onPress={() => setShowWelcome(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="refresh" size={18} color={COLORS.textLight} />
          <Text style={styles.newGameButtonText}>New Game</Text>
        </TouchableOpacity>
      </ScrollView>
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
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 15,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
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
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 3,
  },
  moneyText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
    marginLeft: 8,
  },
  progressContainer: {
    marginBottom: 20,
  },
  progressBar: {
    height: 12,
    backgroundColor: COLORS.boardBg,
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 6,
  },
  progressText: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'right',
    marginTop: 4,
  },
  boardContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  board: {
    width: Math.min(SCREEN_WIDTH - 40, 400),
    height: Math.min(SCREEN_WIDTH - 40, 400),
    backgroundColor: COLORS.boardBg,
    borderRadius: Math.min(SCREEN_WIDTH - 40, 400) / 2,
    position: 'relative',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 5,
  },
  boardSpace: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
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
    bottom: -5,
    right: -5,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.text,
    justifyContent: 'center',
    alignItems: 'center',
  },
  boardCenter: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -50 }, { translateY: -35 }],
    width: 100,
    alignItems: 'center',
  },
  boardCenterTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 5,
  },
  spaceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    marginBottom: 20,
    alignSelf: 'center',
  },
  spaceInfoText: {
    fontSize: 16,
    color: COLORS.text,
    marginLeft: 10,
    fontWeight: '500',
  },
  diceSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 20,
  },
  dice: {
    width: 70,
    height: 70,
    backgroundColor: COLORS.white,
    borderRadius: 12,
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
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.text,
    transform: [{ translateX: -6 }, { translateY: -6 }],
  },
  rollButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 30,
    paddingVertical: 16,
    borderRadius: 30,
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
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
    marginLeft: 10,
  },
  eventPopup: {
    position: 'absolute',
    top: '45%',
    left: 20,
    right: 20,
    backgroundColor: COLORS.white,
    paddingHorizontal: 25,
    paddingVertical: 20,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 6,
  },
  eventText: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  newGameButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginTop: 10,
  },
  newGameButtonText: {
    fontSize: 14,
    color: COLORS.textLight,
    marginLeft: 6,
  },
  // Welcome screen styles
  welcomeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  welcomeTitle: {
    fontSize: 42,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 20,
  },
  welcomeSubtitle: {
    fontSize: 18,
    color: COLORS.textLight,
    marginTop: 8,
    marginBottom: 30,
  },
  welcomeInfo: {
    backgroundColor: COLORS.white,
    padding: 25,
    borderRadius: 20,
    marginBottom: 40,
  },
  welcomeText: {
    fontSize: 16,
    color: COLORS.text,
    textAlign: 'center',
    lineHeight: 24,
  },
  startButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 50,
    paddingVertical: 18,
    borderRadius: 30,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 5,
    elevation: 4,
  },
  startButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  continueButton: {
    marginTop: 20,
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  // Win screen styles
  winContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  winTitle: {
    fontSize: 38,
    fontWeight: 'bold',
    color: COLORS.gold,
    marginTop: 20,
  },
  winSubtitle: {
    fontSize: 24,
    color: COLORS.text,
    marginTop: 10,
  },
  winTurns: {
    fontSize: 16,
    color: COLORS.textLight,
    marginTop: 8,
    marginBottom: 40,
  },
});
