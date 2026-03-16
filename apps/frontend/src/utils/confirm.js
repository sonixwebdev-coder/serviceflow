/**
 * Show a styled confirmation dialog.
 * Returns true if the user confirmed, false otherwise.
 *
 * @param {Object} options
 * @param {string} options.title        - Dialog title
 * @param {string} options.text         - Dialog body text
 * @param {string} [options.confirmText]  - Confirm button label (default: 'Da, continuă')
 * @param {string} [options.cancelText]   - Cancel button label (default: 'Anulează')
 * @param {'warning'|'error'|'info'|'question'} [options.icon] - Icon type
 * @param {boolean} [options.danger]    - When true, confirm button is red
 */
export const confirm = async ({
  title,
  text,
  confirmText = 'Da, continuă',
  cancelText = 'Anulează',
  icon = 'warning',
  danger = false,
} = {}) => {
  const { default: Swal } = await import('sweetalert2');
  const result = await Swal.fire({
    title,
    text,
    icon,
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    reverseButtons: true,
    confirmButtonColor: danger ? '#ef4444' : '#f97316',
    cancelButtonColor: '#6b7280',
    customClass: {
      popup: 'rounded-2xl shadow-xl font-sans',
      title: 'text-gray-900 text-lg font-semibold',
      htmlContainer: 'text-gray-600 text-sm',
      confirmButton: 'rounded-lg px-5 py-2.5 text-sm font-medium',
      cancelButton: 'rounded-lg px-5 py-2.5 text-sm font-medium',
    },
    buttonsStyling: true,
    focusCancel: true,
  });

  return result.isConfirmed;
};

export default confirm;
