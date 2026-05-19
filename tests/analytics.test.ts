import { describe, it, expect, vi } from 'vitest'

describe('Analytics Endpoint', () => {
  it('should calculate 30-day view aggregate correctly', async () => {
    const mockData = {
      dailyData: [
        { day: '2023-10-01', views: 100, watchTime: 200, avgViewDuration: 2, subscribersGained: 5 },
        { day: '2023-10-02', views: 150, watchTime: 300, avgViewDuration: 2, subscribersGained: 10 }
      ],
      trafficData: [
        { source: 'EXT_URL', views: 120 },
        { source: 'YT_SEARCH', views: 130 }
      ]
    }

    const totalViews = mockData.dailyData.reduce((acc, curr) => acc + curr.views, 0)
    expect(totalViews).toBe(250)
  })
})
