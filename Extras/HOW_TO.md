# How `Kate's laboratory` was made

(1) Visit https://www.capitoltrades.com/politicians
  - For each page, in devtools type
    `copy([...document.querySelectorAll('a.link-element.index-card-link')].map(x => x.href.replace(location.origin + location.pathname + '/', '')).join('\n'))`

> This turned out not to be so useful.
  
(2) For each of 22 Asset Types, open first trade to survey data format

(3) Using devtools extract data for a detail card of an example trade:
```js
toDate = x => /^\d\d\d\d-\d\d-\d\d$/.test(x) ? +new Date(x + ' GMT-0600') : x
toNumber = x => Number.isFinite(+x) ? +x : x;
toNull = x => x === 'N/A' ? null : x;
$ = x => toNull(toNumber(toDate(document.querySelector(x)?.textContent)))
$.href = x => document.querySelector(x)?.href
$.all = x => [...document.querySelectorAll(x)].map(y => toNull(toNumber(toDate(y.textContent))));

({
  'Transaction Type': $('.trade-logo'), // `"buy"`, `"sell"`, `"exchange"`, `"receive"`
  'Amount': $('.trade-value'), // $
  Politician: {
    Party: $('.politician .party'),
    Chamber: $('.politician .chamber'),
    State: $('.politician .us-state-full'),
    Name: $('.politician .entity-politician'),
    Link: $.href('.politician .entity-politician')
  },
  Issuer: {
    Ticker: $('.issuer .q-label'), // Possibly `null`
    Name: $('.issuer .entity-issuer'),
    Link: $.href('.issuer .entity-issuer')
  },
  ...Object.fromEntries(
    ((
      labels = $.all('.issuer ~ .q-data-cell .q-label'),
      values = $.all('.issuer ~ .q-data-cell .q-value')
    ) => labels.map((label, i) => [label, values[i]]))()
  ),
  'Additional Information': $('.trade-comment q'),
  'Original Filing': $.href('.view-filing a'),
})
```

(4) On the `/trades` page, collect all "Asset Type" possible values using `$.all('.q-choice-wrapper')`
```js
['ABS', 'Corporate Bond', 'Crypto', 'ETF', 'ETN', 'Futures', 'Municipal Security', 'Hedge/Pvt Eq Funds (non-EIF)', 'Mutual Fund', 'Non-Public Stock', 'indices', 'Other Investment Fund', 'Other Securities', 'Ownership Interest', 'Preferred Shares', 'Private Equity Fund', 'REIT', 'Stock', 'Stock Appreciation Right', 'Stock Options', 'Variable Annuity', 'Venture Capital']
```

> Discovered in step (2):
> - `indices` has no trades
> - `ABS` has only 1 trade from Pelosi

(5) On the `/trades` page, found out `document.querySelectorAll('a.entity-transaction')[0].click()` will visit a row.

(6) On a particular `/trades/...` page, `document.querySelector('.controls.show-details div').click()` will expand the detail card to enable step (3) to be run.

(7) On the `/trades` page, `document.querySelector('a.next').click()` will advance to the next page.

Alternatively, visiting `/trades?page=3` will go to page 3.

The page isn't loaded until `document.querySelector('.q-pagination')` is present (the page number indicator).

(8) Discovered after 3000+ pages had been collected by playwright at rate of 12 rows / 5 seconds that `/trades?page=1&pageSize=100` lets you control the number of rows per page... (Could say `pageSize=42402`) to get all rows on one page.)