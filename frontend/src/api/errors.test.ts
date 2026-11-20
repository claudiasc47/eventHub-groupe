import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios'
import { describe, expect, it } from 'vitest'
import { getApiError, NETWORK_ERROR_MESSAGE, UNEXPECTED_ERROR_MESSAGE } from './errors'

function axiosErrorWithResponse(status: number, data: unknown): AxiosError {
  const config = { headers: new AxiosHeaders() }
  const response: AxiosResponse = { status, statusText: '', data, headers: {}, config }
  return new AxiosError('Request failed', 'ERR_BAD_RESPONSE', config, {}, response)
}

describe('getApiError', () => {
  it('range les erreurs de validation par champ', () => {
    const error = axiosErrorWithResponse(400, {
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: 'Certaines données sont invalides.',
      details: [
        { field: 'capacity', message: 'La capacité doit être un entier positif.' },
        { field: 'name', message: 'Le nom est obligatoire.' },
      ],
    })

    const result = getApiError(error)

    expect(result).toEqual({
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'Certaines données sont invalides.',
      fieldErrors: {
        capacity: 'La capacité doit être un entier positif.',
        name: 'Le nom est obligatoire.',
      },
    })
  })

  it('renvoie le code et le message d’une erreur métier', () => {
    const error = axiosErrorWithResponse(409, {
      statusCode: 409,
      code: 'INSUFFICIENT_SEATS',
      message: 'Il ne reste pas assez de places pour cette demande.',
    })

    const result = getApiError(error)

    expect(result).toEqual({
      status: 409,
      code: 'INSUFFICIENT_SEATS',
      message: 'Il ne reste pas assez de places pour cette demande.',
      fieldErrors: {},
    })
  })

  it('garde le message du serveur mais ignore un code inconnu du contrat', () => {
    const error = axiosErrorWithResponse(409, {
      statusCode: 409,
      code: 'SOMETHING_NEW',
      message: 'Message du serveur.',
    })

    const result = getApiError(error)

    expect(result.code).toBeNull()
    expect(result.message).toBe('Message du serveur.')
  })

  it('signale un serveur injoignable quand la requête n’a pas de réponse', () => {
    const error = new AxiosError('Network Error', 'ERR_NETWORK')

    const result = getApiError(error)

    expect(result).toEqual({
      status: null,
      code: null,
      message: NETWORK_ERROR_MESSAGE,
      fieldErrors: {},
    })
  })

  it('renvoie un message générique quand la réponse ne suit pas le format du contrat', () => {
    const error = axiosErrorWithResponse(502, '<html>Bad Gateway</html>')

    const result = getApiError(error)

    expect(result).toEqual({
      status: 502,
      code: null,
      message: UNEXPECTED_ERROR_MESSAGE,
      fieldErrors: {},
    })
  })

  it('ne plante pas sur une erreur qui ne vient pas d’Axios', () => {
    const result = getApiError(new TypeError('boom'))

    expect(result).toEqual({
      status: null,
      code: null,
      message: UNEXPECTED_ERROR_MESSAGE,
      fieldErrors: {},
    })
  })
})
