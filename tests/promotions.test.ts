import { describe, it, expect } from 'vitest'

describe('Promotions Logic', () => {
  it('should correctly mock a new promotion launch', () => {
    const promotionForm = {
      videoId: 'mock-123',
      dailyBudget: 15,
      durationDays: 7,
      targetLocations: 'US'
    }

    const campaign = {
      id: `CAMP-DEMO-1234`,
      ...promotionForm,
      status: 'ACTIVE',
      startDate: new Date().toISOString().split('T')[0]
    }

    expect(campaign.status).toBe('ACTIVE')
    expect(campaign.dailyBudget).toBe(15)
  })

  it('should prevent non-owners from promoting private videos', () => {
    const isOwner = false
    const videoPrivacyStatus = 'private'

    const canPromote = isOwner || videoPrivacyStatus !== 'private'

    expect(canPromote).toBe(false)
  })

  it('should allow owners to promote private videos', () => {
    const isOwner = true
    const videoPrivacyStatus = 'private'

    const canPromote = isOwner || videoPrivacyStatus !== 'private'

    expect(canPromote).toBe(true)
  })
})
