import { Devvit, useState, useForm, useAsync } from '@devvit/public-api';
import { GamePixelText } from './components/GamePixelText.js';
import { StyledButton } from './components/StyledButton.js';
import Settings from './settings.json';

Devvit.configure({
  redditAPI: true,
  redis: true,
});

Devvit.addCustomPostType({
  name: 'Out of the Crowd Post',
  height: 'regular',
  render: (context) => {
    const [screen, setScreen] = useState<'front' | 'play' | 'howto' | 'leaderboard'>('front');
    const [score, setScore] = useState<number | null>(null);
    const [feedback, setFeedback] = useState<string>('');
    const [attempts, setAttempts] = useState<number>(0);
    const [validGuess, setValidGuess] = useState<boolean>(false);
    const [posts, setPosts] = useState<any[]>([]);
    const [postIndex, setPostIndex] = useState<number>(0);

    // Fetch posts and comments when "play" screen is set
    const { data, loading, error } = useAsync(
      async () => {
        const user = await context.reddit.getCurrentUser();
        const posts = await context.reddit.getHotPosts({
          subredditName: 'AskReddit',
          timeframe: 'day',
          limit: 100,
        }).all();

        if (posts.length === 0) throw new Error("No posts found!");
        setPosts(posts);

        const post = posts[postIndex];
        if(user){
          const played = await context.redis.hGet(`user:played:${user.username}`, post.id);
          if (played) setPostIndex(postIndex + 1);
        }

        const fetchedComments = await context.reddit.getComments({
          postId: post.id,
          limit: 100,
          sort: 'top',
        }).all();

        return {
          postId: post.id,
          postTitle: post.title,
          comments: fetchedComments.map((comment: any) => ({
            body: comment.body as string,
            score: comment.score as number,
          })),
        };
      },
      { depends: [screen === 'play', postIndex] } // Fetch only when 'play' screen is set
    );

    const normalizeText = (text: string) => {
      return text
        .toLowerCase()
        .replace(/[^\w\s]|_/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    };

    const guessForm = useForm(
      {
        title: 'Enter Your Guess',
        description: `Guess the least popular valid answer!\nYou have ${3 - attempts} attempts to pick a valid answer.`,
        acceptLabel: 'Submit Guess',
        fields: [
          { type: 'string', name: 'guess', label: 'Your Guess:', required: true },
        ],
      },
      async (values) => {
        if (validGuess) return;

        const userGuess = normalizeText(values.guess);
        const comments = data?.comments || [];
        const { postId } = data || {};
        let closestMatch: { body: string; score: number } | null = null;

        const commentScores = comments.map((comment) => comment.score);
        const lowestScore = Math.min(...commentScores);
        const highestScore = Math.max(...commentScores);

        for (const comment of comments) {
          const commentText = normalizeText(comment.body);
          if (commentText.includes(userGuess)) {
            console.log(commentText, userGuess, comment.score);
            closestMatch = comment;
            break;
          }
        }

        if (closestMatch) {
          const { score } = closestMatch;
          const points = Math.max(Math.round(
            100 - ((score - lowestScore) / (highestScore - lowestScore)) * 100
          ), 1);

          let totalScore = points;
          const user = await context.reddit.getCurrentUser();
          if(user){
            await context.redis.zIncrBy('leaderboard', user.username, points);
            await context.redis.hSet(`user:played:${user.username}`, { [postId!]: '1' });
            console.log('Leaderboard:', await context.redis.zRange('leaderboard', 0, -1, { withScores: true }));
            totalScore = await context.redis.zScore('leaderboard', user.username) || 0;

            if (points === 100) {
              await context.reddit.setUserFlair({
                subredditName: 'OutOfTheCrowd',
                text: '🏆 Certified Crowd Whisperer',
                username: user.username,
                cssClass: 'winner',
              });
            }

            if (points === 1) {
              await context.reddit.setUserFlair({
                subredditName: 'OutOfTheCrowd',
                text: '🤡 NPC Energy',
                username: user.username,
                cssClass: 'loser',
              });
            }
          }
          setFeedback(`Matched! You earned ${points} points.`);
          setScore(Number(totalScore) || 0);
          setValidGuess(true);
        } else {
          if(attempts + 1 >= 3){
            setFeedback('Game Over, you have used all your attempts!');
            setScore(0);
          }
          else {
            setFeedback('❌ No match found. Try again!');
          }
          setAttempts((prev) => prev + 1);
        }
      }
    );

    // Front Screen
    if (screen === 'front') {
      return (
        <vstack width="100%" height="100%" alignment="center middle" backgroundColor='#60c6dd'>
          <spacer grow />
          <vstack alignment="center middle" gap="small">
            <GamePixelText scale={3}>Out of the Crowd</GamePixelText>
            <spacer height="16px" />
            <StyledButton
              width={'256px'}
              appearance="primary"
              height={'48px'}
              onPress={() => setScreen('play')}
              label="PLAY"
            />
            <StyledButton
              width={'256px'}
              appearance="secondary"
              height={'48px'}
              onPress={() => setScreen('leaderboard')}
              label="LEADERBOARD"
            />
            <StyledButton
              width={'256px'}
              appearance="secondary"
              height={'48px'}
              onPress={() => setScreen('howto')}
              label="HOW TO PLAY"
            />
          </vstack>
          <spacer grow />
        </vstack>
      );
    }

    if (screen === 'leaderboard') {
      const { data: leaderboard, loading, error } = useAsync(async () => {
        // Fetch the top 10 scores with `zRange`
        const redisData = await context.redis.zRange('leaderboard', 0, 9, { withScores: true });
        console.log("Raw leaderboard data:", redisData);

        // Use `redisData` directly since it's already structured as an array of objects
        const topScores = redisData.map((entry: { member: string; score: number }) => ({
          member: entry.member,
          score: entry.score,
        }));
        topScores.sort((a, b) => b.score - a.score);

        // Fetch current user's score and rank
        const user = await context.reddit.getCurrentUser();
        let userScore: number | null = null;
        let userRank: number | null = null;

        if (user) {
          userScore = await context.redis.zScore('leaderboard', user.username) || null;
          const userRankRaw = await context.redis.zRank('leaderboard', user.username) || 0;
          userRank = userRankRaw !== null ? userRankRaw : null;
        }

        return {
          topScores,
          userScore,
          userRank,
        };
      }, { depends: [screen === 'leaderboard'] });

      // Loading state
      if (loading) {
        return (
          <vstack height="100%" width="100%" alignment="center middle" backgroundColor="#60c6dd">
            <GamePixelText scale={2} color={Settings.theme.primary}>
              Loading Leaderboard...
            </GamePixelText>
          </vstack>
        );
      }

      // Error state
      if (error) {
        console.error("Leaderboard Error:", error);
        return (
          <vstack height="100%" width="100%" alignment="center middle" backgroundColor="#60c6dd">
            <GamePixelText scale={3} color="red">
              Error: {error.message}
            </GamePixelText>
            <StyledButton
              width={'256px'}
              height={'48px'}
              appearance="primary"
              label="Back to Home"
              onPress={() => setScreen('front')}
            />
          </vstack>
        );
      }

      // Handle null data case
      if (!leaderboard) {
        return (
          <vstack height="100%" width="100%" alignment="center middle" backgroundColor="#60c6dd">
            <GamePixelText scale={3} color={Settings.theme.primary}>
              No Leaderboard Data Available
            </GamePixelText>
            <StyledButton
              width={'256px'}
              height={'48px'}
              appearance="primary"
              label="Back to Home"
              onPress={() => setScreen('front')}
            />
          </vstack>
        );
      }

      // Destructure leaderboard data
      let { topScores, userScore, userRank } = leaderboard;
      const top = [
        { member: "Syryssylynys", score: 88985 },
        { member: "madthumbz", score: 58602 },
        { member: "Darth_Marko_23", score: 55902 },
        { member: "Phalloblaster", score: 55170 },
        { member: "Dreamenjoyer", score: 49536 },
        { member: "POTUS_King", score: 43245 },
        { member: "Coffeenomnom_", score: 41992 },
        { member: "Old_Timey_Lemon", score: 25932 },
      ];

      return (
        <vstack width="100%" height="100%" backgroundColor="#60c6dd">
          <spacer height="24px" />
          <hstack grow>
            <spacer width="24px" />
            <zstack alignment="start top" grow>
              {/* Shadow */}
              <vstack width="100%" height="100%">
                <spacer height="4px" />
                <hstack grow>
                  <spacer width="4px" />
                  <hstack grow backgroundColor={Settings.theme.shadow} />
                </hstack>
              </vstack>

              {/* Card */}
              <vstack width="100%" height="100%">
                <hstack grow>
                  <vstack grow backgroundColor="white">
                    {/* Header */}
                    <hstack width="100%" alignment="middle">
                      <spacer grow />
                      <GamePixelText scale={3} color={Settings.theme.primary}>
                        Leaderboard
                      </GamePixelText>
                      <spacer grow />
                      <StyledButton
                        appearance="primary"
                        label="x"
                        width="32px"
                        height="32px"
                        onPress={() => setScreen('front')}
                      />
                      <spacer width="8px" />
                    </hstack>
                    <spacer grow/>
                    {/* Card Content */}
                    <vstack width="100%" height="80%" backgroundColor="white" gap="small">
                      {/* Leaderboard Rows */}
                      {topScores.map(({ member, score }, index) => (
                        <hstack key={index.toString()} alignment="center middle" gap="medium">
                          {/* Rank */}
                          <spacer width="8px" />
                          <GamePixelText scale={1.5} color="#4A90E2">{`${index + 1}.`}</GamePixelText>

                          {/* Username */}
                          <GamePixelText scale={1.5} color="#000000">{member}</GamePixelText>

                          <spacer grow />

                          {/* Score */}
                          <GamePixelText scale={1.5} color="#4A90E2">{score.toLocaleString()}</GamePixelText>
                          <spacer width="8px" />
                        </hstack>
                      ))}
                      <spacer grow />
                      <hstack alignment="center middle" gap="small">
                        <spacer width="8px" />
                        <GamePixelText scale={1.4} color={Settings.theme.primary}>{`Your Rank: ${userRank}`}</GamePixelText>
                        <spacer grow />
                        <GamePixelText scale={1.4} color={Settings.theme.secondary}>{`Your Score: ${userScore}`}</GamePixelText>
                        <spacer width="8px" />
                      </hstack>
                    </vstack>
                    <spacer height="8px" />
                  </vstack>
                  <spacer width="4px" />
                </hstack>
                <spacer height="4px" />
              </vstack>
            </zstack>
            <spacer width="20px" />
          </hstack>
          <spacer height="20px" />
        </vstack>
      );
    }


    // How to Play
    if (screen === 'howto') {
      return (
        <vstack width="100%" height="100%" backgroundColor='#60c6dd'>
          <spacer height="24px" />

          {/* Card Container */}
          <hstack grow>
            <spacer width="24px" />

            <zstack alignment="start top" grow>
              {/* Shadow */}
              <vstack width="100%" height="100%">
                <spacer height="4px" />
                <hstack grow>
                  <spacer width="4px" />
                  <hstack grow backgroundColor={Settings.theme.shadow} />
                </hstack>
              </vstack>

              {/* Card */}
              <vstack width="100%" height="100%">
                <hstack grow>
                  <vstack grow backgroundColor="white">
                    {/* Header */}
                    <hstack width="100%" alignment="middle">
                      <spacer grow />
                      <GamePixelText scale={2} color={Settings.theme.primary}>
                        How to Play
                      </GamePixelText>
                      <spacer grow />
                      <StyledButton
                        appearance="primary"
                        label="x"
                        width="32px"
                        height="32px"
                        onPress={() => setScreen('front')}
                      />
                      <spacer width="8px" />
                    </hstack>
                    <spacer height="16px" />
                    {/* Card Content */}
                    <vstack grow alignment="center middle">
                      <GamePixelText scale={2.2}>Guess the least</GamePixelText>
                      <spacer height="4px" />
                      <GamePixelText scale={2.2}>popular valid answer</GamePixelText>
                      <spacer height="4px" />
                      <spacer height="24px" />
                      <GamePixelText scale={1.5} color={Settings.theme.secondary}>
                        You have 3 attempts
                      </GamePixelText>
                      <spacer height="4px" />
                      <GamePixelText scale={1.5} color={Settings.theme.secondary}>
                        to pick a valid answer.
                      </GamePixelText>
                      <spacer height="4px" />
                      <GamePixelText scale={1.5} color={Settings.theme.secondary}>
                        The rarer your answer,
                      </GamePixelText>
                      <spacer height="4px" />
                      <GamePixelText scale={1.5} color={Settings.theme.secondary}>
                        the higher your score!
                      </GamePixelText>
                    </vstack>
                    <spacer height="8px" />
                  </vstack>
                  <spacer width="4px" />
                </hstack>
                <spacer height="4px" />
              </vstack>
            </zstack>
            <spacer width="20px" />
          </hstack>
          <spacer height="20px" />
        </vstack>
      );
    }

    // Play Screen
    if (screen === 'play') {
      if (loading) {
        return (
          <vstack height="100%" width="100%" alignment="center middle" backgroundColor="#60c6dd">
            <GamePixelText scale={2} color={Settings.theme.primary}>Loading question...</GamePixelText>
          </vstack>
        );
      }

      if (error) {
        console.log("Error loading play screen:", error);
        return (
          <vstack height="100%" width="100%" alignment="center middle" backgroundColor="#60c6dd">
            <GamePixelText scale={2} color="red">{error.message}</GamePixelText>
            <spacer height="32px" />
            <StyledButton
              width={'256px'}
              appearance="primary"
              height={'48px'}
              label="Back to Home"
              onPress={() => setScreen('front')}
            />
          </vstack>
        );
      }

      return (
        <vstack height="100%" width="100%" alignment="center middle" backgroundColor="#60c6dd" gap="medium">
          <GamePixelText scale={2} color={Settings.theme.primary}>Question:</GamePixelText>
          <spacer height="4px" />
          <text
            wrap
            color={Settings.theme.secondary}
            alignment="center middle"
            size="large"
            weight="bold"
          >
            {data?.postTitle || ''}
          </text>
          <spacer height="16px" />

          {!validGuess && attempts < 3 && (
            <StyledButton
              width={'256px'}
              appearance="primary"
              height={'48px'}
              label="Enter Your Guess"
              onPress={() => context.ui.showForm(guessForm)}
            />
          )}

          {feedback && (
            <vstack alignment="center middle" gap="small">
              <GamePixelText scale={1.2} color={Settings.theme.primary}>{feedback}</GamePixelText>
              {score !== null && (
                <GamePixelText scale={1.5} color={Settings.theme.secondary}>
                  {`Your Score: ${score}`}
                </GamePixelText>
              )}
            </vstack>
          )}

          {feedback && postIndex < 99 && (
            <StyledButton
              width={'256px'}
              appearance="primary"
              height={'48px'}
              label="Next Round"
              onPress={() => {
                setFeedback('');
                setValidGuess(false);
                setAttempts(0);
                setPostIndex(postIndex + 1);
              }}
            />
          )}

          <StyledButton
            width={'256px'}
            height={'48px'}
            appearance="secondary"
            label="Back to Home"
            onPress={() => setScreen('front')}
          />
        </vstack>
      );
    }

    return null;
  },
});

export default Devvit;
