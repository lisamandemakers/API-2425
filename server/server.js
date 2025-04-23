// 1. Imports, laad externe modules (packages) in.
import 'dotenv/config';
import { App } from '@tinyhttp/app';
import { logger } from '@tinyhttp/logger';
import { Liquid } from 'liquidjs';
import sirv from 'sirv';
import fetch from 'node-fetch';
import { LocalStorage } from 'node-localstorage';

// Maak een opslagmap aan ('scratch') waar alles wordt opgeslagen
const localStorage = new LocalStorage('./scratch');


// Haal opgeslagen favorieten op, of begin met een lege array
const getFavorites = () => {
  const stored = localStorage.getItem('favorites');
  return stored ? JSON.parse(stored) : [];
};

// Sla favorieten op in LocalStorage
const saveFavorites = (favorites) => {
  localStorage.setItem('favorites', JSON.stringify(favorites));
};
// localStorage.setItem('favorites', []);



// 3. LiquidJS instellen, zorgt ervoor dat alle .liquid bestanden worden verwerkt
const engine = new Liquid({
  extname: '.liquid',
});

// 4. Webserver maken met TinyHTTP
const app = new App();

// 5. Middelware instellen en service starten
app
  .use(logger())
  .use('/', sirv(process.env.NODE_ENV === 'development' ? 'client' : 'dist'))
  .listen(3000, () => console.log('Server available on http://localhost:3000'));

// 6. Homepagina met categorieën en zoekfunctie
app.get('/', async (req, res) => {
  const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
  const query = req.query.query;
  const category = req.query.category;

  // 🔍 Zoekfunctie of categorie-filter
  if (query || category) {
    let searchQuery = query;

    if (!query && category) {
      if (category === 'new') searchQuery = 'kristin';
      if (category === 'literature') searchQuery = 'literature';
      if (category === 'bestsellers') searchQuery = 'bestsellers';
    }

    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(searchQuery)}&key=${apiKey}&maxResults=40`;

    try {
      const response = await fetch(url);
      const json = await response.json();
      const books = (json.items || []).map(item => ({
        id: item.id,
        title: item.volumeInfo.title,
        authors: item.volumeInfo.authors,
        thumbnail: item.volumeInfo.imageLinks?.thumbnail,
      }));

      return res.send(renderTemplate('server/views/index.liquid', {
        title: 'Zoekresultaten',
        query,
        category,
        searchResults: books,
      }));
    } catch (error) {
      console.error('Error fetching search results:', error);
      return res.status(500).send('Zoeken mislukt');
    }
  }

  // 📚 Standaardcategorieën op homepage
  const categories = {
    newReleases: 'kristin',
    literature: 'literature',
    bestSelling: 'bestsellers',
  };

  try {
    const results = await Promise.all(
      Object.entries(categories).map(async ([key, query]) => {
        const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&key=${apiKey}&maxResults=12`;
        const response = await fetch(url);
        const json = await response.json();

        return [
          key,
          (json.items || []).map(item => ({
            id: item.id,
            title: item.volumeInfo.title,
            authors: item.volumeInfo.authors,
            thumbnail: item.volumeInfo.imageLinks?.thumbnail,
          })),
        ];
      })
    );

    const data = Object.fromEntries(results);

    return res.send(renderTemplate('server/views/index.liquid', {
      title: 'Home',
      ...data,
    }));
  } catch (error) {
    console.error('Error fetching books:', error);
    return res.status(500).send('Failed to fetch books');
  }
});

// 7. Boek-detailpagina op basis van ID
app.get('/book/:id', async (req, res) => {
  const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
  const id = req.params.id;

  const url = `https://www.googleapis.com/books/v1/volumes/${id}?key=${apiKey}`;

  try {
    const response = await fetch(url);
    const item = await response.json();

    const book = {
      id: item.id,
      title: item.volumeInfo.title,
      date: item.volumeInfo.publishedDate,
      authors: item.volumeInfo.authors,
      description: item.volumeInfo.description,
      thumbnail: item.volumeInfo.imageLinks?.thumbnail,
      rating: item.volumeInfo.averageRating || 'Geen rating',
    };

    return res.send(renderTemplate('server/views/detail.liquid', {
      title: book.title,
      book,
      favorites: getFavorites().map(f => f.id), // Voeg dit toe!
    }));
  } catch (error) {
    console.error('Error fetching book detail:', error);
    return res.status(500).send('Boek ophalen mislukt');
  }
});

// 8. Favorietenpagina
app.get('/favorites', (req, res) => {
  const favorites = getFavorites();

  return res.send(renderTemplate('server/views/favorites.liquid', {
    title: 'Favorieten',
    favorites,
  }));
});


// 9. Template-rendering functie
const renderTemplate = (template, data) => {
  const templateData = {
    NODE_ENV: process.env.NODE_ENV || 'production',
    ...data
  };

  return engine.renderFileSync(template, templateData);
};


// 10. Favorieten opslaan (tijdelijk in geheugen)
app.post('/favorites/:id', async (req, res) => {
  const id = req.params.id
  try {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const body = Buffer.concat(chunks).toString();
    const data = new URLSearchParams(body);

    const book = {
      id: id,
      title: data.get('title'),
      authors: data.get('authors')?.split(','),
      thumbnail: data.get('thumbnail'),
    };

    const favorites = getFavorites();
    // Voeg toe als boek nog niet bestaat
    if (!favorites.find(savedBook => savedBook.id === book.id)) {
      favorites.push(book);
      saveFavorites(favorites);
    }

    return res.redirect('/book/'+id);

  } catch (error) {
    console.error('Favoriet toevoegen mislukt:', error);
    res.status(500).send('Fout bij opslaan favoriet');
  }
});


app.post('/favorites/delete/:id', async (req, res) => {
  const idToDelete = req.params.id

  const favorites = getFavorites()
  const filtered = favorites.filter(favorite => {
    if (favorite.id !== idToDelete) {
      return favorite;
    }
  })

  saveFavorites(filtered);

    return res.redirect('/favorites');

  // try {
  //   console.log(idToDelete)

  //   // Verwijder het boek met dat id
  //   // favorites = favorites.filter(book => book.id !== idToDelete);

  //   return res.redirect('/favorites');
  // } catch (error) {
  //   console.error('Fout bij verwijderen favoriet:', error);
  //   res.status(500).send('Verwijderen mislukt');
  // }
});