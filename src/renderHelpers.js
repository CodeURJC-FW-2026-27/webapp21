/**
 * Helper function to render a success feedback page.
 *
 * @param {import('express').Response} res - Express response object.
 * @param {Object} options - Success page configuration.
 * @param {string} [options.pageTitle] - Browser tab title.
 * @param {string} options.title - Main card heading text.
 * @param {string|string[]} [options.messages] - Feedback messages or details.
 * @param {string} [options.message] - Alternative single feedback message.
 * @param {string} [options.buttonUrl='/'] - Redirection destination URL.
 * @param {string} [options.buttonText='Continuar'] - Button label.
 * @param {number} [status=200] - HTTP status code.
 */
export function renderSuccess(res, options = {}, status = 200) {
    const messages = Array.isArray(options.messages)
        ? options.messages
        : options.message
            ? [options.message]
            : options.messages
                ? [options.messages]
                : [];

    return res.status(status).render('message', {
        pageTitle: options.pageTitle || options.title || 'Operación completada',
        isError: false,
        title: options.title || 'Operación realizada con éxito',
        messages,
        buttonUrl: options.buttonUrl || '/',
        buttonText: options.buttonText || 'Continuar'
    });
}

/**
 * Helper function to render an error feedback page with appropriate HTTP status.
 *
 * @param {import('express').Response} res - Express response object.
 * @param {Object} options - Error page configuration.
 * @param {string} [options.pageTitle] - Browser tab title.
 * @param {string} options.title - Main card heading text.
 * @param {string|string[]} [options.messages] - List of error messages.
 * @param {string} [options.message] - Alternative single error message.
 * @param {string} [options.buttonUrl='/'] - Return / retry button destination URL.
 * @param {string} [options.buttonText='Volver'] - Button label.
 * @param {number} [status=400] - HTTP status code (e.g. 400 for validation errors, 404 for not found).
 */
export function renderError(res, options = {}, status = 400) {
    const messages = Array.isArray(options.messages)
        ? options.messages
        : options.message
            ? [options.message]
            : options.messages
                ? [options.messages]
                : ['Ha ocurrido un error al procesar la solicitud.'];

    return res.status(status).render('message', {
        pageTitle: options.pageTitle || options.title || 'Error',
        isError: true,
        title: options.title || 'Error en la operación',
        messages,
        buttonUrl: options.buttonUrl || '/',
        buttonText: options.buttonText || 'Volver'
    });
}
