const root = document.documentElement;
const hiddenModalElements = [];
const debugMode = true;

window.onload = function() {
    maxZIndexOnLoad = getMaxZIndex(root, zElementFilter);
    console.log('maxZIndexOnload: ' + maxZIndexOnLoad);
    initMutationObserver();
    initOverflowMutationObserver();
};

/**
 * Criteria for considering an element's z-index is that it actually
 * takes up space
 * @param {Element} element 
 */
function zElementFilter(element) {
    return element.scrollWidth > 0 && element.scrollHeight > 0;
}

/**
 * Get the largest z-index among element and its children
 * @param {Element} element 
 * @param {Function} element_filter 
 */
function getMaxZIndex(element, element_filter) {
    if (element == null || typeof element != 'Element') {
        return Number.NEGATIVE_INFINITY;
    }

    let maxZIndex = getZIndex(element);

    for (const child of element.children) {
        if (element_filter(child)) {
            maxZIndex = Math.max(maxZIndex, getMaxZIndex(child, element_filter));
        }
    }

    return maxZIndex;
}

function getZIndex(element) {
    let zIndex = window.getComputedStyle(element).getPropertyValue('z-index');

    return zIndex == null || zIndex == "" || isNaN(zIndex) ?
             Number.NEGATIVE_INFINITY : Number.parseInt(zIndex);
}

function initMutationObserver() {
    const mutationObserver = new MutationObserver(handleMutation);
    const observerOptions = {
        attributes: false,
        characterData: false,
        childList: true,
        subtree: true
    }
    mutationObserver.observe(root, observerOptions);
}

function handleMutation(mutationList, observer) {
    const filteredMutationList = mutationList.filter(mutationFilter);
    // addedNodes is an array of nodeLists
    const addedNodes = filteredMutationList.map(mutationRecord => mutationRecord.addedNodes);

    for (const nodeList of addedNodes) {
        for (const element of nodeList) {
            hiddenModalElements.push(element);
            element.style.setProperty('display', 'none');
        }
    }
}

/**
 * @param {MutationRecord} mutationRecord
 * @returns {Boolean} false if object fails any of the conditions/filters.
 *                    Otherwise true.
 */
function mutationFilter(mutationRecord) {
    if (mutationRecord == null
        || mutationRecord.addedNodes == null
        || mutationRecord.addedNodes.length <= 0) {
        debug('filtering out mutationRecord because it did not meet base criteria:');
        debug(mutationRecord);
        return false;
    }
    
    for (const element of mutationRecord.addedNodes) {
        const zIndex = getMaxZIndex(element, zElementFilter);
        if (zIndex > maxZIndexOnLoad) {
            debug('larger z-index found: ' + zIndex + ' removing element ' + element);
            return true;
        }
    }
    
    return false;
}

/**
 *  configure mutation observer to trigger when an element is modified
 *  to set overflow or overflow-y to hidden which is a common approach
 *  to disable scrolling.
 */
function initOverflowMutationObserver() {
    const mutationObserver = new MutationObserver(handleOverflowMutation);
    const observerOptions = {
        attributes: true,
        attributeFilter: [ 'style' ],
        // necessary to ensure that the overflow CSS property was added
        // and not something else
        attributeOldValue: true,
        characterData: false,
        childList: false,
        subtree: true
    }
    mutationObserver.observe(root, observerOptions);
}

function handleOverflowMutation(mutationList, observer) {
    const filteredMutationList = mutationList.filter(overFlowMutationFilter);
    debug('filteredMutationList: ' + filteredMutationList);
    // updatedNodes is an array of nodeLists
    const updatedNodes = filteredMutationList.map(mutationRecord => mutationRecord.target);
    debug('updateNodes: ' + updatedNodes);

    for (let element of updatedNodes) {
        if (element.style.getPropertyValue('overflow') == 'hidden') {
            element.style.removeProperty('overflow');
        } else if (element.style.getPropertyValue('overflow-y') == 'hidden') {
            element.style.removeProperty('overflow-y');
        }
    }
}

/**
 * filters out any mutation record that was not modified to contain
 * overflow or overflow-y 
 * @param {MutationRecord} mutationRecord
 * @returns {Boolean} false if object fails any of the conditions/filters.
 *                    Otherwise true.
 */
function overFlowMutationFilter(mutationRecord) {
    return mutationRecord != null
        && mutationRecord.attributeName == "style"
        && mutationRecord.target != null
        // typeof mutationRecord.target == 
        // && mutationRecord.target.attributes.getNamedItem('style') != null
        // && (mutationRecord.target.attributes.getNamedItem('style').value == 'hidden'
        //     || mutationRecord.target.attributes.getNamedItem('style').value == 'hidden')
        && (mutationRecord.target.style.getPropertyValue('overflow') == 'hidden'
            || mutationRecord.target.style.getPropertyValue('overflow-y') == 'hidden')
        && (mutationRecord.oldValue == null
            || !mutationRecord.oldValue.includes('overflow'));
}

/**
 * log to console if debugMode is enabled
 * @param {String} message 
 */
function debug(message) {
    if (debugMode) {
        console.log(message);
    }
}