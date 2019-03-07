# IDX Dynamic Wrapper via AWS

## About

Currently the IDX Broker dynamic wrapper system as several limitations. This is wrapper system using amazon web services to overcome some of thse challenges. This cloud based wrapper system attemps to slove this issue.

This will not work 100% universally.

The system uses API Gateway and Lambda functions to retieve the source html for a page, transfor the the source code and return this new html source to be stored in the IDX Broker wrapper systtem.

Page html is never stored in AWS instead each retrieval and transofrmation occurs upon request.

Process and transofrmations:
* Fetch page html
* Make relative path links to absolute path links.
* Remove H1 tag
* Remove <base /> tag from the head section
* Add IDX div start and stop tags in id or class passed in params
* Change title tag if passed as a param
* Find '$' and replace with 'JQuery' inside script tags
* Return transformed html

## Required

* An enabled IDX Broker account.
* A publicly available web page with valid html structure. An opening and closing head and body tag nested in an opening and closing html tag
* A target element. Will accept tag name, id, or class (single classs only)
* A target element value

## Use

This system is avalable at the following endpoint:

https://zl6t6xxpc2.execute-api.us-west-2.amazonaws.com/wrappers/wrapper

Pass the required and option parameters using ? and & delineation.

Accepted parameters and descriptions

| Parameters | Required | Values                                                      |
|:----------:|----------|-------------------------------------------------------------|
| site       | yes      | the web page url to use for a dynamic wrapper               |
| target     | yes      | the type of target to use in adding IDX start and stop tags |
| id         | no       | the id value targeted                                       |
| class      | no       | the class value targeted                                    |
| el         | no       | the element name value targeted                             |
| title      | no       | The new value for the title meta tag                        |

Example Use: https://zl6t6xxpc2.execute-api.us-west-2.amazonaws.com/wrappers/wrapper?site=https://www.jsutaskrandy.com/&target=class&class=listings-container&title=randy

This endpoint with the required and optional params is then added to the IDX Broker account at the global, category, or page level dynamic wrapper.

A postman collection is included in this repo to aid in discovery.

Known non compatabile sites include:
* JS based sites(like WiX)
* Sites that use url params to indicate the page to be loaded
* Sites using frame sets
* Sites with main content in a form tag
* Sites with relative urls in required extrnal resources
* Sites with relative urls in the CSS
