/**
 * Get localized text from the #loc-data hidden div.
 * @param {string} key The key to look for in the data-key attribute.
 * @param {string} defaultText The default text to return if the key is not found.
 * @returns {string} The localized text.
 */
export function getLocalizedText(key, defaultText) {
    const el = document.querySelector(`#loc-data span[data-key="${key}"]`);
    return el ? el.innerText : defaultText;
}
