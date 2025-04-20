# **Out of the Crowd 🎮**

## **Overview**
**Out of the Crowd** is a fun and engaging Reddit-based guessing game where you try to pick the least popular valid answer from a Reddit thread. The rarer your guess, the higher your score! Compete with other players on the leaderboard to become the ultimate *"Crowd Whisperer"*.

<h1 align="center">
  <a href="[Reddit - Out of the Crowd](https://www.reddit.com/r/OutOfTheCrowd/comments/1hfxu7p/out_of_the_crowd_guess_the_least_popular_answer/)" target="_blank">
    <img src="https://img.shields.io/badge/🌐%20Live%20App-BetBotX-green" alt="Live Game" />
  </a>
</h1>

---

## **How to Play**

1. **Start the Game**
   - On the home screen, press the **"PLAY"** button to begin.
   - The game will pull the top Reddit post from the **AskReddit** subreddit.
   - The comments on the post are the pool of answers.

2. **Enter Your Guess**
   - You have **3 attempts** to enter a valid guess.
   - A valid guess is a word or phrase that appears in one of the top 100 comments.
   - The goal is to find the **least popular** valid answer. The fewer the upvotes, the higher your points.

3. **Scoring**
   - Points are calculated based on the answer's popularity.
   - The formula for scoring is:
     ```
     Points = 100 - ((CommentScore - LowestScore) / (HighestScore - LowestScore)) * 100
     ```
   - If you guess the least popular answer, you earn **100 points**.
   - If your guess doesn’t match any comment, you get a **"No Match"** message.

4. **Feedback**
   - After submitting a guess, the game provides instant feedback:
     - **Correct Guess**: Your points and score will be shown.
     - **Incorrect Guess**: You'll see how many attempts remain.

5. **Leaderboard**
   - Press **"LEADERBOARD"** on the home screen to see the top players.
   - Your rank and score will be displayed if you are not in the top 10.
   - Earn unique flairs based on your performance:
     - 🏆 **"Certified Crowd Whisperer"** for earning 100 points.
     - 🤡 **"NPC Energy"** for earning the lowest score.

6. **How to Play**
   - Click **"HOW TO PLAY"** on the home screen to revisit these instructions.

7. **End the Game**
   - After 3 failed attempts or a correct guess, the game ends, and your score is recorded.

---

## **Game Screens**

1. **Home Screen**
   - Play the game, check the leaderboard, or view instructions.

2. **Game Screen**
   - Displays the Reddit post title.
   - Allows you to input and submit guesses.
   - Provides feedback and score updates.

3. **Leaderboard**
   - Top 10 players are displayed with their ranks, usernames, and scores.
   - Your rank and score are highlighted if not in the top 10.

4. **How to Play**
   - A simple guide on how the game works.

---

## **Features**
- Pulls live Reddit data for dynamic gameplay.
- Interactive leaderboard showcasing top players.
- Unique flair rewards based on performance.
- Intuitive UI with pixel-themed fonts and buttons.

---

## **Setup and Installation**
To run the game locally or deploy it:

1. **Clone the Repository**
   ```bash
   git clone <repository-url>
   cd out-of-the-crowd
   ```

2. **Install Dependencies**
   Ensure you have **Node.js** and **npm** installed.
   ```bash
   npm install
   ```

3. **Run the App**
   ```bash
   npm start
   ```

4. **Deploy**
   Follow your deployment platform's guidelines (e.g., Vercel, Netlify).

---

## **Dependencies**
- `@devvit/public-api`
- React/JSX for UI components
- Redis for data storage
- Reddit API for fetching posts and comments

---

## **License**
This project is licensed under the MIT License.

---

Enjoy playing **Out of the Crowd** and may your guesses always be rare! 🎉
