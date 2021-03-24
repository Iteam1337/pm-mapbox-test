import phone from 'phone'

export const validatePhoneNumber = (value: string) => {
  let error
  if (value == '-') return
  const normalizedPhoneNumber = phone(value, 'SWE')
  if (normalizedPhoneNumber.length <= 0) {
    error = 'Fyll i ett korrekt telefonnummer'
  }
  return error
}

export const validateAddress = (value: any) => {
  let error
  if (!value.lon || !value.lat) {
    error = 'Adressen kunde inte hittas'
  }

  return error
}

export const validateNotEmpty = (value: string) => {
  let error
  if (value == '') {
    error = 'Fyll i ett namn på transporten'
  }

  return error
}
