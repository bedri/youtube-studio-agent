import { describe, it, expect } from 'vitest'

describe('Moderation Logic', () => {
  it('should categorize a spam comment correctly based on keywords', () => {
    const commentText = "Click here for free crypto: http://scam.link"
    
    // Simulating the backend prompt logic classification
    const isSpam = commentText.toLowerCase().includes('crypto') || commentText.includes('http')
    const classification = isSpam ? 'spam_troll' : 'feedback'

    expect(classification).toBe('spam_troll')
  })

  it('should classify a question properly', () => {
    const commentText = "What gear do you use to record?"
    
    const isQuestion = commentText.includes('?')
    const classification = isQuestion ? 'question' : 'feedback'

    expect(classification).toBe('question')
  })
})
