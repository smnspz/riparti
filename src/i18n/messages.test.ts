import { describe, expect, it } from 'vitest'
import { en, it as italian, translate, type Translate } from './messages'
import { translateTripError } from './tripErrors'

describe('translations', () => {
  it('defines the same keys in Italian and English', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(italian).sort())
  })

  it('interpolates placeholders in both languages', () => {
    expect(translate('it', 'leg.title', { n: 2 })).toBe('Tratta 2')
    expect(translate('en', 'leg.title', { n: 2 })).toBe('Leg 2')
  })

  it('keeps unknown placeholders untouched', () => {
    expect(translate('it', 'leg.title', {})).toBe('Tratta {n}')
  })
})

describe('translateTripError', () => {
  const t: Translate = (key, params) => translate('it', key, params)

  it('translates leg validation errors', () => {
    expect(
      translateTripError(
        new Error('Leg 2: distanceKm must be greater than 0'),
        t,
      ),
    ).toBe('Tratta 2: la distanza deve essere maggiore di 0.')
  })

  it('translates duplicate passenger errors', () => {
    expect(
      translateTripError(new Error('Duplicate passenger id: alice'), t),
    ).toBe('Passeggero ripetuto (alice).')
  })

  it('keeps unrecognized messages unchanged', () => {
    expect(translateTripError(new Error('Something else'), t)).toBe(
      'Something else',
    )
  })
})
