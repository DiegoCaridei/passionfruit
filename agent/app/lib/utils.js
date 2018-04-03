export const hasOwnProperty = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key)
export const toString = s => String.prototype.toString.call(s)

export function echo(subject, event, data) {
  const time = Date.now()
  const backtrace = (this && this.context) ?
    Thread.backtrace(this.context, Backtracer.ACCURATE)
      .map(DebugSymbol.fromAddress).filter(e => e.name) : []

  send({
    subject,
    event,
    data,
    time,
    backtrace,
  })
}
