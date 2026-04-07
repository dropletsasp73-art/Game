#!/usr/bin/env python3
"""
Easy Street Game Backend API Test Suite
Tests all backend endpoints for the Easy Street game
"""

import requests
import json
import sys
from datetime import datetime

# Base URL from frontend environment
BASE_URL = "https://stress-free-game-1.preview.emergentagent.com/api"

class EasyStreetAPITester:
    def __init__(self):
        self.base_url = BASE_URL
        self.session = requests.Session()
        self.test_results = []
        self.created_profile_id = None
        self.created_game_id = None
        
    def log_test(self, test_name, success, details="", response_data=None):
        """Log test results"""
        result = {
            "test": test_name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        if response_data:
            result["response_data"] = response_data
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"   Details: {details}")
        if not success and response_data:
            print(f"   Response: {response_data}")
        print()

    def test_health_endpoints(self):
        """Test health check endpoints"""
        print("=== Testing Health Endpoints ===")
        
        # Test root endpoint
        try:
            response = self.session.get(f"{self.base_url}/")
            if response.status_code == 200:
                data = response.json()
                if "message" in data and "Easy Street" in data["message"]:
                    self.log_test("GET / - Root health check", True, f"Status: {response.status_code}, Message: {data.get('message')}")
                else:
                    self.log_test("GET / - Root health check", False, f"Unexpected response format", data)
            else:
                self.log_test("GET / - Root health check", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_test("GET / - Root health check", False, f"Exception: {str(e)}")

        # Test health endpoint
        try:
            response = self.session.get(f"{self.base_url}/health")
            if response.status_code == 200:
                data = response.json()
                if data.get("status") == "healthy":
                    self.log_test("GET /health - Health status", True, f"Status: {data.get('status')}, Service: {data.get('service')}")
                else:
                    self.log_test("GET /health - Health status", False, f"Unexpected health status", data)
            else:
                self.log_test("GET /health - Health status", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_test("GET /health - Health status", False, f"Exception: {str(e)}")

    def test_static_data_endpoints(self):
        """Test endpoints that return static data"""
        print("=== Testing Static Data Endpoints ===")
        
        # Test characters endpoint
        try:
            response = self.session.get(f"{self.base_url}/characters")
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) and len(data) > 0:
                    # Check if characters have required fields
                    first_char = data[0]
                    required_fields = ["id", "name", "icon", "color", "price"]
                    if all(field in first_char for field in required_fields):
                        self.log_test("GET /characters - Get all characters", True, f"Found {len(data)} characters")
                    else:
                        self.log_test("GET /characters - Get all characters", False, f"Missing required fields in character data", first_char)
                else:
                    self.log_test("GET /characters - Get all characters", False, f"Expected list of characters", data)
            else:
                self.log_test("GET /characters - Get all characters", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_test("GET /characters - Get all characters", False, f"Exception: {str(e)}")

        # Test powerups endpoint
        try:
            response = self.session.get(f"{self.base_url}/powerups")
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) and len(data) > 0:
                    # Check if powerups have required fields
                    first_powerup = data[0]
                    required_fields = ["id", "name", "description", "price", "icon"]
                    if all(field in first_powerup for field in required_fields):
                        self.log_test("GET /powerups - Get all powerups", True, f"Found {len(data)} powerups")
                    else:
                        self.log_test("GET /powerups - Get all powerups", False, f"Missing required fields in powerup data", first_powerup)
                else:
                    self.log_test("GET /powerups - Get all powerups", False, f"Expected list of powerups", data)
            else:
                self.log_test("GET /powerups - Get all powerups", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_test("GET /powerups - Get all powerups", False, f"Exception: {str(e)}")

    def test_profile_endpoints(self):
        """Test player profile endpoints"""
        print("=== Testing Profile Endpoints ===")
        
        # Test profile creation
        try:
            profile_data = {"player_name": "TestPlayer"}
            response = self.session.post(f"{self.base_url}/profiles", json=profile_data)
            if response.status_code == 200:
                data = response.json()
                if "id" in data and data.get("player_name") == "TestPlayer":
                    self.created_profile_id = data["id"]
                    self.log_test("POST /profiles - Create player profile", True, f"Created profile with ID: {self.created_profile_id}")
                else:
                    self.log_test("POST /profiles - Create player profile", False, f"Unexpected response format", data)
            else:
                self.log_test("POST /profiles - Create player profile", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_test("POST /profiles - Create player profile", False, f"Exception: {str(e)}")

        # Test profile retrieval
        if self.created_profile_id:
            try:
                response = self.session.get(f"{self.base_url}/profiles/{self.created_profile_id}")
                if response.status_code == 200:
                    data = response.json()
                    if data.get("id") == self.created_profile_id and data.get("player_name") == "TestPlayer":
                        self.log_test("GET /profiles/{player_id} - Get profile by ID", True, f"Retrieved profile for {data.get('player_name')}")
                    else:
                        self.log_test("GET /profiles/{player_id} - Get profile by ID", False, f"Profile data mismatch", data)
                else:
                    self.log_test("GET /profiles/{player_id} - Get profile by ID", False, f"Status: {response.status_code}", response.text)
            except Exception as e:
                self.log_test("GET /profiles/{player_id} - Get profile by ID", False, f"Exception: {str(e)}")
        else:
            self.log_test("GET /profiles/{player_id} - Get profile by ID", False, "No profile ID available from creation test")

    def test_game_endpoints(self):
        """Test game state endpoints"""
        print("=== Testing Game Endpoints ===")
        
        if not self.created_profile_id:
            self.log_test("Game endpoints", False, "No profile ID available - skipping game tests")
            return

        # Test game creation
        try:
            game_data = {
                "player_id": self.created_profile_id,
                "player_name": "TestPlayer",
                "character": "sunny",
                "difficulty": "easy",
                "map_type": "classic",
                "is_solo": False
            }
            response = self.session.post(f"{self.base_url}/games", json=game_data)
            if response.status_code == 200:
                data = response.json()
                if "id" in data and data.get("player_id") == self.created_profile_id:
                    self.created_game_id = data["id"]
                    self.log_test("POST /games - Create new game", True, f"Created game with ID: {self.created_game_id}")
                else:
                    self.log_test("POST /games - Create new game", False, f"Unexpected response format", data)
            else:
                self.log_test("POST /games - Create new game", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_test("POST /games - Create new game", False, f"Exception: {str(e)}")

        # Test game state update
        if self.created_game_id:
            try:
                update_data = {
                    "money": 150,
                    "position": 5,
                    "turn_count": 3,
                    "is_completed": False
                }
                response = self.session.put(f"{self.base_url}/games/{self.created_game_id}", json=update_data)
                if response.status_code == 200:
                    data = response.json()
                    if data.get("money") == 150 and data.get("position") == 5:
                        self.log_test("PUT /games/{game_id} - Update game state", True, f"Updated game state: money={data.get('money')}, position={data.get('position')}")
                    else:
                        self.log_test("PUT /games/{game_id} - Update game state", False, f"Game state not updated correctly", data)
                else:
                    self.log_test("PUT /games/{game_id} - Update game state", False, f"Status: {response.status_code}", response.text)
            except Exception as e:
                self.log_test("PUT /games/{game_id} - Update game state", False, f"Exception: {str(e)}")

            # Test game completion
            try:
                completion_data = {
                    "money": 200,
                    "position": 10,
                    "turn_count": 15,
                    "is_completed": True,
                    "is_winner": True
                }
                response = self.session.put(f"{self.base_url}/games/{self.created_game_id}", json=completion_data)
                if response.status_code == 200:
                    data = response.json()
                    if data.get("is_completed") == True and data.get("is_winner") == True:
                        self.log_test("PUT /games/{game_id} - Complete game", True, f"Game completed successfully: final_money={data.get('final_money')}")
                    else:
                        self.log_test("PUT /games/{game_id} - Complete game", False, f"Game completion not recorded correctly", data)
                else:
                    self.log_test("PUT /games/{game_id} - Complete game", False, f"Status: {response.status_code}", response.text)
            except Exception as e:
                self.log_test("PUT /games/{game_id} - Complete game", False, f"Exception: {str(e)}")
        else:
            self.log_test("PUT /games/{game_id} - Update/Complete game", False, "No game ID available from creation test")

    def test_win_recording(self):
        """Test win recording endpoint"""
        print("=== Testing Win Recording ===")
        
        if not self.created_profile_id:
            self.log_test("Win recording", False, "No profile ID available - skipping win recording test")
            return

        try:
            response = self.session.post(f"{self.base_url}/profiles/{self.created_profile_id}/record-win?turns=15&difficulty=easy")
            if response.status_code == 200:
                data = response.json()
                if "coins_earned" in data and "total_coins" in data:
                    self.log_test("POST /profiles/{player_id}/record-win - Record a win", True, f"Coins earned: {data.get('coins_earned')}, Total coins: {data.get('total_coins')}")
                else:
                    self.log_test("POST /profiles/{player_id}/record-win - Record a win", False, f"Unexpected response format", data)
            else:
                self.log_test("POST /profiles/{player_id}/record-win - Record a win", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_test("POST /profiles/{player_id}/record-win - Record a win", False, f"Exception: {str(e)}")

    def test_leaderboard(self):
        """Test leaderboard endpoint"""
        print("=== Testing Leaderboard ===")
        
        try:
            response = self.session.get(f"{self.base_url}/leaderboard")
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_test("GET /leaderboard - Get leaderboard", True, f"Retrieved leaderboard with {len(data)} entries")
                else:
                    self.log_test("GET /leaderboard - Get leaderboard", False, f"Expected list response", data)
            else:
                self.log_test("GET /leaderboard - Get leaderboard", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_test("GET /leaderboard - Get leaderboard", False, f"Exception: {str(e)}")

    def run_all_tests(self):
        """Run all API tests"""
        print(f"Starting Easy Street API Tests")
        print(f"Base URL: {self.base_url}")
        print("=" * 50)
        
        self.test_health_endpoints()
        self.test_static_data_endpoints()
        self.test_profile_endpoints()
        self.test_game_endpoints()
        self.test_win_recording()
        self.test_leaderboard()
        
        # Summary
        print("=" * 50)
        print("TEST SUMMARY")
        print("=" * 50)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result["success"])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        if failed_tests > 0:
            print("\nFAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"❌ {result['test']}: {result['details']}")
        
        return failed_tests == 0

if __name__ == "__main__":
    tester = EasyStreetAPITester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)