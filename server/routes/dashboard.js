const express = require('express');
const axios = require('axios');
const { database } = require('../utils/database');

const router = express.Router();

// Get dashboard statistics
router.get('/stats', async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get task statistics
    const taskStats = await database.all(
      `SELECT 
         status,
         COUNT(*) as count
       FROM tasks 
       WHERE user_id = ? 
       GROUP BY status`,
      [userId]
    );
    
    // Get priority distribution
    const priorityStats = await database.all(
      `SELECT 
         priority,
         COUNT(*) as count
       FROM tasks 
       WHERE user_id = ? 
       GROUP BY priority`,
      [userId]
    );
    
    // Get completion rate for the last 30 days
    const completionStats = await database.all(
      `SELECT 
         DATE(created_at) as date,
         COUNT(*) as created,
         SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
       FROM tasks 
       WHERE user_id = ? AND created_at >= date('now', '-30 days')
       GROUP BY DATE(created_at)
       ORDER BY date DESC`,
      [userId]
    );
    
    // Get upcoming deadlines
    const upcomingDeadlines = await database.all(
      `SELECT id, title, due_date, priority
       FROM tasks 
       WHERE user_id = ? 
         AND due_date IS NOT NULL 
         AND due_date > datetime('now')
         AND status NOT IN ('completed', 'cancelled')
       ORDER BY due_date ASC
       LIMIT 5`,
      [userId]
    );
    
    // Get overdue tasks
    const overdueTasks = await database.all(
      `SELECT id, title, due_date, priority
       FROM tasks 
       WHERE user_id = ? 
         AND due_date < datetime('now')
         AND status NOT IN ('completed', 'cancelled')
       ORDER BY due_date ASC`,
      [userId]
    );
    
    // Calculate productivity metrics
    const totalTasks = taskStats.reduce((sum, stat) => sum + stat.count, 0);
    const completedTasks = taskStats.find(stat => stat.status === 'completed')?.count || 0;
    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks * 100).toFixed(1) : 0;
    
    res.json({
      stats: {
        totalTasks,
        completedTasks,
        completionRate: parseFloat(completionRate),
        tasksByStatus: taskStats.reduce((acc, stat) => {
          acc[stat.status] = stat.count;
          return acc;
        }, {}),
        tasksByPriority: priorityStats.reduce((acc, stat) => {
          acc[stat.priority] = stat.count;
          return acc;
        }, {}),
        completionTrend: completionStats,
        upcomingDeadlines,
        overdueTasks: overdueTasks.length
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
});

// Get weather information
router.get('/weather', async (req, res) => {
  try {
    const { lat, lon, city } = req.query;
    
    // Use OpenWeatherMap API (you'll need to get a free API key)
    const API_KEY = process.env.OPENWEATHER_API_KEY;
    
    if (!API_KEY) {
      return res.json({
        weather: {
          location: 'Location not set',
          temperature: '--',
          description: 'Weather service not configured',
          humidity: '--',
          windSpeed: '--',
          icon: 'cloudy'
        }
      });
    }
    
    let url = `https://api.openweathermap.org/data/2.5/weather?appid=${API_KEY}&units=metric`;
    
    if (lat && lon) {
      url += `&lat=${lat}&lon=${lon}`;
    } else if (city) {
      url += `&q=${encodeURIComponent(city)}`;
    } else {
      // Default to London if no location provided
      url += '&q=London';
    }
    
    const response = await axios.get(url, { timeout: 5000 });
    const data = response.data;
    
    res.json({
      weather: {
        location: data.name,
        temperature: Math.round(data.main.temp),
        description: data.weather[0].description,
        humidity: data.main.humidity,
        windSpeed: data.wind.speed,
        icon: data.weather[0].icon
      }
    });
  } catch (error) {
    console.error('Get weather error:', error);
    
    // Return fallback weather data
    res.json({
      weather: {
        location: 'Unknown',
        temperature: '--',
        description: 'Weather data unavailable',
        humidity: '--',
        windSpeed: '--',
        icon: 'cloudy'
      }
    });
  }
});

// Get news feed
router.get('/news', async (req, res) => {
  try {
    const { category = 'technology', limit = 5 } = req.query;
    
    // Use NewsAPI (you'll need to get a free API key)
    const API_KEY = process.env.NEWS_API_KEY;
    
    if (!API_KEY) {
      return res.json({
        news: [
          {
            title: 'News Service Not Configured',
            description: 'Please configure NEWS_API_KEY environment variable to enable news feed.',
            url: '#',
            publishedAt: new Date().toISOString(),
            source: 'System'
          }
        ]
      });
    }
    
    const response = await axios.get(`https://newsapi.org/v2/top-headlines`, {
      params: {
        apiKey: API_KEY,
        category: category,
        language: 'en',
        pageSize: limit
      },
      timeout: 5000
    });
    
    const articles = response.data.articles.map(article => ({
      title: article.title,
      description: article.description,
      url: article.url,
      publishedAt: article.publishedAt,
      source: article.source.name,
      urlToImage: article.urlToImage
    }));
    
    res.json({ news: articles });
  } catch (error) {
    console.error('Get news error:', error);
    
    // Return fallback news data
    res.json({
      news: [
        {
          title: 'News Unavailable',
          description: 'Unable to fetch news at this time. Please try again later.',
          url: '#',
          publishedAt: new Date().toISOString(),
          source: 'System'
        }
      ]
    });
  }
});

// Get productivity insights
router.get('/insights', async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get task creation patterns
    const creationPattern = await database.all(
      `SELECT 
         strftime('%H', created_at) as hour,
         COUNT(*) as count
       FROM tasks 
       WHERE user_id = ? AND created_at >= date('now', '-30 days')
       GROUP BY strftime('%H', created_at)
       ORDER BY hour`,
      [userId]
    );
    
    // Get completion patterns
    const completionPattern = await database.all(
      `SELECT 
         strftime('%w', updated_at) as day_of_week,
         COUNT(*) as count
       FROM tasks 
       WHERE user_id = ? 
         AND status = 'completed' 
         AND updated_at >= date('now', '-30 days')
       GROUP BY strftime('%w', updated_at)
       ORDER BY day_of_week`,
      [userId]
    );
    
    // Get average task completion time
    const avgCompletionTime = await database.get(
      `SELECT 
         AVG(julianday(updated_at) - julianday(created_at)) as avg_days
       FROM tasks 
       WHERE user_id = ? 
         AND status = 'completed'
         AND updated_at >= date('now', '-30 days')`,
      [userId]
    );
    
    // Get most productive day
    const productiveDay = await database.get(
      `SELECT 
         strftime('%w', updated_at) as day_of_week,
         COUNT(*) as count
       FROM tasks 
       WHERE user_id = ? 
         AND status = 'completed' 
         AND updated_at >= date('now', '-30 days')
       GROUP BY strftime('%w', updated_at)
       ORDER BY count DESC
       LIMIT 1`,
      [userId]
    );
    
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    res.json({
      insights: {
        creationPattern: creationPattern.map(item => ({
          hour: parseInt(item.hour),
          count: item.count
        })),
        completionPattern: completionPattern.map(item => ({
          day: dayNames[parseInt(item.day_of_week)],
          count: item.count
        })),
        avgCompletionTime: avgCompletionTime?.avg_days ? 
          Math.round(avgCompletionTime.avg_days * 10) / 10 : null,
        mostProductiveDay: productiveDay ? 
          dayNames[parseInt(productiveDay.day_of_week)] : null
      }
    });
  } catch (error) {
    console.error('Get insights error:', error);
    res.status(500).json({ error: 'Failed to fetch productivity insights' });
  }
});

module.exports = router;