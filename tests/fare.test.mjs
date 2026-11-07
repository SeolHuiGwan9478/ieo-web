import test from 'node:test'
import assert from 'node:assert/strict'
import { billedFareFor, fareFor, feeRateOf } from '../src/lib/fare.ts'

test('청구 100원과 수수료 10%는 지급 90원, 수수료 10원이 된다', () => {
  assert.equal(fareFor(100, 10), 90)
  assert.equal(100 - fareFor(100, 10), 10)
  assert.equal(feeRateOf(90, 100), 10)
})

test('청구 금액이 1,000원 미만이어도 원 단위로 계산한다', () => {
  assert.equal(fareFor(999, 10), 899)
  assert.equal(fareFor(101, 50), 51)
  assert.equal(fareFor(5, 90), 1)
})

test('청구 금액 역산도 서버와 같은 원 단위 반올림을 적용한다', () => {
  assert.equal(billedFareFor(90, 10), 100)
  assert.equal(billedFareFor(100, 10), 111)
  assert.equal(billedFareFor(450000, 12.5), 514286)
})

test('0원과 수수료 0%도 계산한다', () => {
  assert.equal(fareFor(0, 10), 0)
  assert.equal(fareFor(100, 0), 100)
  assert.equal(billedFareFor(0, 10), 0)
  assert.equal(feeRateOf(0, 0), null)
})

test('실제 운임과 소수 수수료율을 계산한다', () => {
  assert.equal(fareFor(600000, 10), 540000)
  assert.equal(fareFor(100, 12.5), 88)
  assert.equal(fareFor(100000, 99.9), 100)
})

test('유효하지 않은 금액과 수수료율은 계산하지 않는다', () => {
  for (const fn of [fareFor, billedFareFor]) {
    assert.equal(fn(100, 100), null)
    assert.equal(fn(100, -1), null)
    assert.equal(fn(-100, 10), null)
    assert.equal(fn(Number.NaN, 10), null)
  }
})
