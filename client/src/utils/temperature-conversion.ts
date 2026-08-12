// TEST123PUB-127 / T028 — Body temperature unit conversion utilities

/**
 * Multiplication factor from Celsius to Fahrenheit: 9 / 5.
 * @internal
 */
export const CELSIUS_TO_FAHRENHEIT_FACTOR = 9 / 5;

/**
 * Additive offset used when converting Celsius to Fahrenheit.
 * @internal
 */
export const FAHRENHEIT_OFFSET = 32;

/**
 * Convert a temperature value from Celsius to Fahrenheit.
 *
 * Formula: °F = (°C × 9/5) + 32
 * Accuracy: maximum rounding error ≤ 0.1 °F (SC-006).
 *
 * @param celsius - Temperature in degrees Celsius.
 * @returns Temperature in degrees Fahrenheit, rounded to one decimal place.
 */
export function celsiusToFahrenheit(celsius: number): number {
  return Math.round((celsius * CELSIUS_TO_FAHRENHEIT_FACTOR + FAHRENHEIT_OFFSET) * 10) / 10;
}

/**
 * Convert a temperature value from Fahrenheit to Celsius.
 *
 * Formula: °C = (°F − 32) × 5/9
 * Accuracy: maximum rounding error ≤ 0.1 °C (SC-006).
 *
 * @param fahrenheit - Temperature in degrees Fahrenheit.
 * @returns Temperature in degrees Celsius, rounded to one decimal place.
 */
export function fahrenheitToCelsius(fahrenheit: number): number {
  return Math.round(((fahrenheit - FAHRENHEIT_OFFSET) / CELSIUS_TO_FAHRENHEIT_FACTOR) * 10) / 10;
}
