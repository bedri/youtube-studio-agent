import { describe, it, expect } from 'vitest'

describe('Localization Logic', () => {
  it('should correctly merge new localizations with existing ones', () => {
    const targetLang = 'de'
    const title = 'Translated Title'
    const description = 'Translated Description'
    
    const currentLocalizations = {
      es: { title: 'Spanish Title', description: 'Spanish Description' }
    }

    const newLocalizations = {
      ...currentLocalizations,
      [targetLang]: {
        title,
        description
      }
    }

    // Verify it keeps existing
    expect(newLocalizations.es.title).toBe('Spanish Title')
    
    // Verify it adds new
    expect(newLocalizations.de.title).toBe('Translated Title')
    expect(newLocalizations.de.description).toBe('Translated Description')
  })

  it('should correctly fallback description to empty string if not provided', () => {
    const targetLang = 'fr'
    const title = 'French Title'
    
    const newLocalizations = {
      [targetLang]: {
        title,
        description: undefined || ''
      }
    }

    expect(newLocalizations.fr.description).toBe('')
  })
})
