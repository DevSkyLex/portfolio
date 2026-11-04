import {
  formatTime,
  minuteStepAttribute,
  padSegment,
  parseTime,
  stepSegment,
} from '@internal/ui/lib/time-input/utils/time-input/time-input.utils';

describe('parseTime', () => {
  it('reads a 24-hour HH:mm time', () => {
    expect(parseTime('00:00')).toEqual({ hours: 0, minutes: 0 });
    expect(parseTime('23:59')).toEqual({ hours: 23, minutes: 59 });
    expect(parseTime('07:05')).toEqual({ hours: 7, minutes: 5 });
  });

  it('gives two empty segments for anything else', () => {
    for (const value of ['', '7:05', '24:00', '12:60', '12:30:00', ' 12:30', 'midi']) {
      expect(parseTime(value)).toEqual({ hours: null, minutes: null });
    }
  });
});

describe('formatTime', () => {
  it('pads complete segments and gives an empty string while one is empty', () => {
    expect(formatTime({ hours: 9, minutes: 5 })).toBe('09:05');
    expect(formatTime({ hours: 9, minutes: null })).toBe('');
    expect(formatTime({ hours: null, minutes: 5 })).toBe('');
  });
});

describe('padSegment', () => {
  it('writes two digits, or nothing for an empty segment', () => {
    expect(padSegment(7)).toBe('07');
    expect(padSegment(23)).toBe('23');
    expect(padSegment(null)).toBe('');
  });
});

describe('stepSegment', () => {
  it('starts an empty segment at either end', () => {
    expect(stepSegment(null, 1, 1, 23)).toBe(0);
    expect(stepSegment(null, -1, 1, 23)).toBe(23);
    expect(stepSegment(null, -1, 15, 59)).toBe(45);
  });

  it('steps and wraps at both ends', () => {
    expect(stepSegment(22, 1, 1, 23)).toBe(23);
    expect(stepSegment(23, 1, 1, 23)).toBe(0);
    expect(stepSegment(0, -1, 1, 23)).toBe(23);
    expect(stepSegment(22, 4, 1, 23)).toBe(2);
    expect(stepSegment(1, -4, 1, 23)).toBe(21);
  });

  it('snaps a value between two multiples in the direction of travel', () => {
    expect(stepSegment(7, 1, 15, 59)).toBe(15);
    expect(stepSegment(7, -1, 15, 59)).toBe(0);
    expect(stepSegment(59, 1, 15, 59)).toBe(0);
    expect(stepSegment(59, -1, 15, 59)).toBe(45);
    expect(stepSegment(50, 1, 7, 59)).toBe(56);
    expect(stepSegment(56, 1, 7, 59)).toBe(0);
  });
});

describe('minuteStepAttribute', () => {
  it('accepts an integer from 1 to 59 and falls back to 1', () => {
    expect(minuteStepAttribute(15)).toBe(15);
    expect(minuteStepAttribute('5')).toBe(5);
    for (const value of [0, 60, 2.5, '', null, undefined, 'x']) {
      expect(minuteStepAttribute(value)).toBe(1);
    }
  });
});
