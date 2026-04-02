/**
 * Haptics Utility
 * Provides subtle tactile feedback for mobile devices.
 */

export const Haptics = {
  /**
   * Light 'click' feedback.
   */
  light() {
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(10);
    }
  },

  /**
   * Slightly stronger 'thud' feedback.
   */
  medium() {
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(20);
    }
  },

  /**
   * Double-tap style success feedback.
   */
  success() {
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate([10, 30, 10]);
    }
  },

  /**
   * Alert style feedback for errors or warnings.
   */
  error() {
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate([50, 50, 50]);
    }
  }
};
