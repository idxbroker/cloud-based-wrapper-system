const axios = require('axios')
const cheerio = require('cheerio')
const absolutify = require('absolutify')
const converter = require('rel-to-abs')
const extractDomain = /^(?:https?:\/\/)?(?:[^@\/\n]+@)?(?:www\.)?([^:\/?\n]+)/gim
const idxtags = '<div id="idxStart"></div><div id="idxStop"></div>'

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

exports.handler = async (event) => {
  const params = event.params.querystring
  let url = params.site
  const titleTag = params.title
  const target = params.target
  const h1Ignore = params.h1Ignore
  const domain = url.match(extractDomain)
  const response = await getSite(url)

  if (response.code >= 200 && response.code < 300) {
    // handle for possible trailing slash in source url
    if (url.substr(-1) === '/') {
      url = url.substr(0, url.length - 1)
    }

    // pass to absolutify to make all links aboslute paths and to cheerio for further transformation
    let relativeLinksAbsolute = absolutify(response.data, domain[0])
    relativeLinksAbsolute = converter.convert(relativeLinksAbsolute, domain[0])

    // load html into cheerio
    const $ = cheerio.load(relativeLinksAbsolute)

    // update title tag, remove base and H1 tags, add idx start and stop tags
    $('title').html(titleTag)
    $('base').remove()

    if (h1Ignore == 'y') {
      $('H1').remove()
    } 

    switch (target) {
      case 'id':
        addStartStopTags($, `#${params.id}`)
        break
      case 'element':
        addStartStopTags($, params.el)
        break
      case 'class':
        addStartStopTags($, `.${params.class}`)
        break
      default:
        $('html').text('ERROR: no target was provided')
        break
    }

    // replace dollar signs with 'jQuery' to avoid IDX jQuery conflicts
    $('script').each(function() {
      $(this).html().replace(/\$/g, 'jQuery')
    })

    // return new wrapper html
    return $.html()
  } else {
    const errorMessage = {
      error: 'Did not recieve a 200 http code',
      siteRequested: url
    }
    console.log(errorMessage)
    return errorMessage
  }
}
