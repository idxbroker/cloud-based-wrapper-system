const axios = require('axios');
const cheerio = require('cheerio');
const absolutify = require('absolutify');
const converter = require('rel-to-abs');
const extractDomain = /^(?:https?:\/\/)?(?:[^@\/\n]+@)?(?:www\.)?([^:\/?\n]+)/gim;
const idxtags = '<div id="idxStart"></div><div id="idxStop"></div>';

function getSite (url) {
  return axios.get(url)
    .then(response => {
      return {
        code: response.status,
        data: response.data
      }
    })
    .catch(error => {
      return error
    })
}

function addStartStopTags ($, pageTarget) {
  if (typeof pageTarget !== 'undefined' && $(pageTarget).length > 0) {
    return $(pageTarget).html(idxtags)
  } else {
    return $('html').html('Error: Unable to add IDX start and stop tags. Target not found. Please check the target is valid')
  }
}

/**
 * Form tags that surround our content will break functionality, especially with things like the Advanced Search. 
 * This function will remove the form element containing our target.
 * @param {HTMLElement} element, the element we want to check for a parent form tag.
 */
function removeEnclosingFormTag($, element) {
  let containingForm = $(element).closest('form');

  if (containingForm) {
    let newParentDiv = $('<div id="idxFormReplacementDiv" class="form"></form>');
    $(containingForm).parent().prepend(newParentDiv);
    $(newParentDiv).append(containingForm.children());  
    console.log('movement done?');
    return true;
  }

  console.log('Form not found.');

  return false;

}

// Uses the URL object to return the provided path in absolute terms, using the base if needed
// Note that if the path is already absolute, the base will not be used.
function getAbsoluteUrl(path, base) {
  let url = new URL(path, base);
  return url.href;
}

/**
 * Goes through each element with the given tagName and makes the indicated attribute an absolute url.
 * @param {*} $ 
 * @param {*} tagName 
 * @param {*} attribute 
 */
function turnElementAttributeAbsolute($, tagName, attribute, base) {
    $(tagName).each(function() {
        let element = $(this);
        let attributeValue = element.attr(attribute);

        // Script tags might not have an src attribute set; when this is the case, we shouldn't change anything.
        if (tagName == 'script' 
        && attributeValue == undefined) {
          return;
        }

        element.attr(attribute, getAbsoluteUrl(attributeValue, base));
    });
}

exports.handler = async (event) => {
  const params = event.params.querystring;
  var url = params.site
  const titleTag = params.title
  const target = params.target
  const h1Ignore = params.h1Ignore
  const removeConflicts = params.removeConflicts;
  const domain = url.match(extractDomain)
  const response = await getSite(url)

  if (response.code >= 200 && response.code < 300) {
    // handle for possible trailing slash in source url
    if (url.substr(-1) === '/') {
      url = url.substr(0, url.length - 1)
    } 

    /* Commenting out absolutify call because it isn't properly updating the paths for some resources
    // pass to absolutify to make all links aboslute paths and to cheerio for further transformation
    let relativeLinksAbsolute = absolutify(response.data, domain[0])
    relativeLinksAbsolute = converter.convert(relativeLinksAbsolute, domain[0])
    */


    // load html into cheerio
    const $ = cheerio.load(response.data)

    // update title tag, remove base and H1 tags, add idx start and stop tags
    $('title').html(titleTag)
    $('base').remove()

    if (h1Ignore !== 'y') {
        $('H1').remove()
    } 

    // Correct relative to absolute links
    turnElementAttributeAbsolute($, 'a', 'href', url);
    turnElementAttributeAbsolute($, 'img', 'src', url);
    turnElementAttributeAbsolute($, 'link', 'href', url);
    turnElementAttributeAbsolute($, 'script', 'src', url);

    // Try to remove any known script conflicts if removeConflicts was set
    if (removeConflicts == 'y') {
        let iHomeRegex = /idxhome\.com$/;
        let iHomeFileRegex = /bundle\.js/;
        $('script').each(function(){
            let script = $(this);
            let scriptUrl = new URL(script.attr('src'), url);
            if (iHomeRegex.test(scriptUrl.host)
            && iHomeFileRegex.test(scriptUrl.pathname)) {
              script.remove();
            }
        });
    }

    // Find the target element.
    let targetElement;
    switch (target) {
      case 'id':
        targetElement = $(`#${params.id}`);
        break
      case 'element':
        targetElement = $(params.el);
        break
      case 'class':
        targetElement = $(`.${params.class}`);
        break
      default:
        targetElement = null;
        $('html').text('ERROR: no target was provided');
        break
    }

    // Insert start and stop tags
    if (targetElement) {
      addStartStopTags($, targetElement);
    }

    // replace dollar signs with 'jQuery' to avoid IDX jQuery conflicts
    $('script').each(function() {
      $(this).html().replace(/\$/g, 'jQuery')
    })

    // See if there's a form tag enclosing our target element --- if so, create a new div and move everything outside the form
    if (removeEnclosingFormTag($, targetElement)) {
      console.log('Enclosing form tag detected. Moving children...');
    }

    // return new wrapper html
    return $.html();
  } else {
    const errorMessage = {
      error: 'Did not recieve a 200 http code',
      siteRequested: url
    }
    console.log(errorMessage)
    return errorMessage
  }
}