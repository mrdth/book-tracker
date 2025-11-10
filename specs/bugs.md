Issues:
- when viewing an author page, Book cards include 'unknown author' - this should display all authors for a book
- when searching for an author, authors already imported have a link to their author page, but this uses the externalId instead of the id, we should either include the local ID in teh response, or add a route to view an author page by the externalId
- when importing an author & books, we need pagination for authors with many books.


feature suggestions:
- authors list (homepage)
  - paginated list of authors, sorted lastname, firstname
  - show count of books (#collected)
  - easy navigation / filtering - A-Z links for surname
- fuzzy matching of local book titles during owned check
- handle book series
- sorting?
