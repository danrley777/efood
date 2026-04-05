import { useMemo, useState } from 'react'

const API_URL = 'https://api-ebac.vercel.app/api/efood/checkout'

const initialItems = [
  { id: 1, name: 'Pizza Marguerita', quantity: 1, price: 52.9 },
  { id: 2, name: 'Lasanha da Casa', quantity: 1, price: 39.9 },
  { id: 3, name: 'Tiramisu', quantity: 2, price: 18.5 }
]

const initialForm = {
  receiver: '',
  addressDescription: '',
  city: '',
  zipCode: '',
  number: '',
  complement: '',
  cardName: '',
  cardNumber: '',
  cardCode: '',
  expiresMonth: '',
  expiresYear: ''
}

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL'
})

function formatMoney(value) {
  return currencyFormatter.format(value)
}

function sanitizeDigits(value) {
  return value.replace(/\D/g, '')
}

function maskCardNumber(value) {
  return sanitizeDigits(value)
    .slice(0, 16)
    .replace(/(\d{4})(?=\d)/g, '$1 ')
    .trim()
}

function maskZipCode(value) {
  const digits = sanitizeDigits(value).slice(0, 8)
  return digits.replace(/(\d{5})(\d{1,3})/, '$1-$2')
}

function normalizeApiResponse(data) {
  if (!data || typeof data !== 'object') {
    return {}
  }

  return data
}

function ResponseDetails({ data }) {
  const entries = Object.entries(data)

  if (!entries.length) {
    return <p className="confirmation__fallback">A API respondeu com sucesso, mas sem campos exibiveis.</p>
  }

  return (
    <dl className="response-grid">
      {entries.map(([key, value]) => (
        <div className="response-grid__item" key={key}>
          <dt>{key}</dt>
          <dd>{typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value)}</dd>
        </div>
      ))}
    </dl>
  )
}

export default function App() {
  const [formData, setFormData] = useState(initialForm)
  const [orderItems] = useState(initialItems)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [confirmationData, setConfirmationData] = useState(null)

  const subtotal = useMemo(
    () => orderItems.reduce((total, item) => total + item.price * item.quantity, 0),
    [orderItems]
  )

  const deliveryFee = 8.9
  const total = subtotal + deliveryFee

  const handleChange = (event) => {
    const { name, value } = event.target

    setFormData((current) => {
      if (name === 'cardNumber') {
        return { ...current, [name]: maskCardNumber(value) }
      }

      if (name === 'zipCode') {
        return { ...current, [name]: maskZipCode(value) }
      }

      return { ...current, [name]: value }
    })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setIsSubmitting(true)
    setErrorMessage('')

    const payload = {
      products: orderItems.map((item) => ({
        id: item.id,
        price: item.price
      })),
      delivery: {
        receiver: formData.receiver,
        address: {
          description: formData.addressDescription,
          city: formData.city,
          zipCode: formData.zipCode,
          number: Number(formData.number),
          complement: formData.complement
        }
      },
      payment: {
        card: {
          name: formData.cardName,
          number: sanitizeDigits(formData.cardNumber),
          code: sanitizeDigits(formData.cardCode),
          expires: {
            month: Number(formData.expiresMonth),
            year: Number(formData.expiresYear)
          }
        }
      }
    }

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        throw new Error('Nao foi possivel concluir o pedido. Verifique os dados e tente novamente.')
      }

      const data = normalizeApiResponse(await response.json())
      setConfirmationData({
        response: data,
        receiver: formData.receiver,
        addressSummary: `${formData.addressDescription}, ${formData.number} - ${formData.city}`,
        total: formatMoney(total)
      })
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Ocorreu um erro inesperado ao concluir o pedido.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const orderId =
    confirmationData?.response?.orderId ||
    confirmationData?.response?.id ||
    confirmationData?.response?.pedidoId ||
    null

  if (confirmationData) {
    return (
      <main className="page page--confirmation">
        <section className="confirmation">
          <span className="confirmation__eyebrow">Pedido concluido</span>
          <h1>
            {orderId ? `Pedido ${orderId} confirmado` : 'Seu pedido foi enviado com sucesso'}
          </h1>
          <p className="confirmation__lead">
            A tela abaixo foi preenchida com a resposta retornada pela API, junto do resumo do envio feito no checkout.
          </p>

          <div className="confirmation__summary">
            <div>
              <strong>Recebedor</strong>
              <span>{confirmationData.receiver}</span>
            </div>
            <div>
              <strong>Entrega</strong>
              <span>{confirmationData.addressSummary}</span>
            </div>
            <div>
              <strong>Total</strong>
              <span>{confirmationData.total}</span>
            </div>
          </div>

          <div className="confirmation__response">
            <h2>Dados retornados pela API</h2>
            <ResponseDetails data={confirmationData.response} />
          </div>

          <button className="secondary-button" onClick={() => setConfirmationData(null)} type="button">
            Fazer novo pedido
          </button>
        </section>
      </main>
    )
  }

  return (
    <main className="page">
      <section className="hero">
        <span className="hero__badge">Checkout eFood</span>
        <h1>Finalize a entrega do pedido com uma experiencia clara, responsiva e pronta para API.</h1>
        <p>
          Layout inspirado no exercicio do Figma, com formulario de entrega, pagamento, resumo do pedido e tela de
          confirmacao apos o POST.
        </p>
      </section>

      <div className="checkout-layout">
        <section className="panel">
          <div className="section-heading">
            <span>Etapa 1</span>
            <h2>Dados para entrega</h2>
          </div>

          <form className="checkout-form" onSubmit={handleSubmit}>
            <div className="field-group">
              <label htmlFor="receiver">Quem vai receber</label>
              <input id="receiver" name="receiver" onChange={handleChange} required value={formData.receiver} />
            </div>

            <div className="field-group">
              <label htmlFor="addressDescription">Endereco</label>
              <input
                id="addressDescription"
                name="addressDescription"
                onChange={handleChange}
                placeholder="Rua, avenida ou travessa"
                required
                value={formData.addressDescription}
              />
            </div>

            <div className="field-row">
              <div className="field-group">
                <label htmlFor="city">Cidade</label>
                <input id="city" name="city" onChange={handleChange} required value={formData.city} />
              </div>
              <div className="field-group">
                <label htmlFor="zipCode">CEP</label>
                <input id="zipCode" name="zipCode" onChange={handleChange} required value={formData.zipCode} />
              </div>
            </div>

            <div className="field-row">
              <div className="field-group">
                <label htmlFor="number">Numero</label>
                <input id="number" min="1" name="number" onChange={handleChange} required type="number" value={formData.number} />
              </div>
              <div className="field-group">
                <label htmlFor="complement">Complemento</label>
                <input
                  id="complement"
                  name="complement"
                  onChange={handleChange}
                  placeholder="Apto, bloco, referencia"
                  value={formData.complement}
                />
              </div>
            </div>

            <div className="section-heading section-heading--payment">
              <span>Etapa 2</span>
              <h2>Pagamento</h2>
            </div>

            <div className="field-group">
              <label htmlFor="cardName">Nome no cartao</label>
              <input id="cardName" name="cardName" onChange={handleChange} required value={formData.cardName} />
            </div>

            <div className="field-row">
              <div className="field-group field-group--wide">
                <label htmlFor="cardNumber">Numero do cartao</label>
                <input
                  id="cardNumber"
                  name="cardNumber"
                  onChange={handleChange}
                  placeholder="0000 0000 0000 0000"
                  required
                  value={formData.cardNumber}
                />
              </div>
              <div className="field-group">
                <label htmlFor="cardCode">CVV</label>
                <input
                  id="cardCode"
                  maxLength="4"
                  name="cardCode"
                  onChange={handleChange}
                  required
                  value={formData.cardCode}
                />
              </div>
            </div>

            <div className="field-row">
              <div className="field-group">
                <label htmlFor="expiresMonth">Mes</label>
                <input
                  id="expiresMonth"
                  max="12"
                  min="1"
                  name="expiresMonth"
                  onChange={handleChange}
                  required
                  type="number"
                  value={formData.expiresMonth}
                />
              </div>
              <div className="field-group">
                <label htmlFor="expiresYear">Ano</label>
                <input
                  id="expiresYear"
                  max="2099"
                  min="2026"
                  name="expiresYear"
                  onChange={handleChange}
                  required
                  type="number"
                  value={formData.expiresYear}
                />
              </div>
            </div>

            {errorMessage ? <p className="form-error">{errorMessage}</p> : null}

            <button className="primary-button" disabled={isSubmitting} type="submit">
              {isSubmitting ? 'Concluindo pedido...' : 'Concluir pedido'}
            </button>
          </form>
        </section>

        <aside className="panel panel--summary">
          <div className="section-heading">
            <span>Resumo</span>
            <h2>Seu pedido</h2>
          </div>

          <ul className="order-list">
            {orderItems.map((item) => (
              <li className="order-item" key={item.id}>
                <div>
                  <strong>{item.name}</strong>
                  <span>{item.quantity}x item</span>
                </div>
                <span>{formatMoney(item.price * item.quantity)}</span>
              </li>
            ))}
          </ul>

          <div className="price-breakdown">
            <div>
              <span>Subtotal</span>
              <strong>{formatMoney(subtotal)}</strong>
            </div>
            <div>
              <span>Entrega</span>
              <strong>{formatMoney(deliveryFee)}</strong>
            </div>
            <div className="price-breakdown__total">
              <span>Total a pagar</span>
              <strong>{formatMoney(total)}</strong>
            </div>
          </div>

          <p className="summary-note">
            A requisicao envia os produtos, os dados de entrega e as informacoes do cartao para a rota do exercicio.
          </p>
        </aside>
      </div>
    </main>
  )
}
