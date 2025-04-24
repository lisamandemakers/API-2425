// 1. Imports, laad externe modules (packages) in.
import 'dotenv/config'; // Laadt de omgevingsvariabelen uit een .env bestand
import { App } from '@tinyhttp/app'; // TinyHTTP framework voor het maken van een server
import { logger } from '@tinyhttp/logger'; // Logger om request logs bij te houden
import { Liquid } from 'liquidjs'; // Liquid templating engine om .liquid bestanden te renderen
import sirv from 'sirv'; // Middleware om statische bestanden te serveren (bv. afbeeldingen, CSS)
import fetch from 'node-fetch'; // Module om API-aanroepen te doen (om boeken op te halen)
import { LocalStorage } from 'node-localstorage'; // Om lokale opslag te simuleren op de server

// Maak een opslagmap aan ('scratch') waar alles wordt opgeslagen
const localStorage = new LocalStorage('./scratch');

// 2. Haal opgeslagen favorieten op, of begin met een lege array
const getFavorites = () => {
  const stored = localStorage.getItem('favorites');
  return stored ? JSON.parse(stored) : []; // Als er favorieten zijn, return die, anders een lege array
};

// 3. Sla favorieten op in LocalStorage
const saveFavorites = (favorites) => {
  localStorage.setItem('favorites', JSON.stringify(favorites)); // Zet favorieten in LocalStorage als een JSON string
};

// 4. LiquidJS instellen, zorgt ervoor dat alle .liquid bestanden worden verwerkt
const engine = new Liquid({
  extname: '.liquid', // Stel de extensie van de te renderen sjablonen in als .liquid
});

// 5. Webserver maken met TinyHTTP
const app = new App(); // Maak een nieuwe TinyHTTP app

// 6. Middelware instellen en service starten
app
  .use(logger()) // Gebruik logger middleware voor request logging
  .use('/', sirv(process.env.NODE_ENV === 'development' ? 'client' : 'dist')) // Gebruik sirv voor statische bestandservering (afhankelijk van de omgeving)
  .listen(3000, () => console.log('Server available on http://localhost:3000')); // Start de server op poort 3000

// 7. Homepagina met categorieën en zoekfunctie
app.get('/', async (req, res) => {
  const apiKey = process.env.GOOGLE_BOOKS_API_KEY; // Haal de API-sleutel op uit omgevingsvariabelen
  const query = req.query.query; // Zoekopdracht uit de URL query parameters
  const category = req.query.category; // Categorie uit de URL query parameters

  // 🔍 Zoekfunctie of categorie-filter
  if (query || category) {
    let searchQuery = query; // Zoekterm instellen

    // Als er geen zoekterm is, maar er is een categorie, stel de zoekterm in op basis van de categorie
    if (!query && category) {
      if (category === 'new') searchQuery = 'kristin'; // Nieuwe releases
      if (category === 'literature') searchQuery = 'literature'; // Literatuur
      if (category === 'bestsellers') searchQuery = 'bestsellers'; // Bestsellers
    }

    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(searchQuery)}&key=${apiKey}&maxResults=40`;

    try {
      const response = await fetch(url); // Haal de zoekresultaten op van Google Books API
      const json = await response.json();
      const books = (json.items || []).map(item => ({
        id: item.id, // Het ID van het boek
        title: item.volumeInfo.title, // De titel van het boek
        authors: item.volumeInfo.authors, // De auteurs van het boek
        thumbnail: item.volumeInfo.imageLinks?.thumbnail, // Thumbnail van het boek (indien beschikbaar)
      }));

      // Render de pagina met de zoekresultaten
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

  // 📚 Standaardcategorieën op homepage (zoals nieuwe releases, literatuur, bestsellers)
  const categories = {
    newReleases: 'kristin',
    literature: 'literature',
    bestSelling: 'bestsellers',
  };

  try {
    const results = await Promise.all(
      // Voor elke categorie haal de boeken op
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

    const data = Object.fromEntries(results); // Zet de resultaten om naar een object

    // Render de homepage met de boeken van de verschillende categorieën
    return res.send(renderTemplate('server/views/index.liquid', {
      title: 'Home',
      ...data,
    }));
  } catch (error) {
    console.error('Error fetching books:', error);
    return res.status(500).send('Failed to fetch books');
  }
});

// 8. Boek-detailpagina op basis van ID
app.get('/book/:id', async (req, res) => {
  const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
  const id = req.params.id; // Haal het boek ID uit de URL

  const url = `https://www.googleapis.com/books/v1/volumes/${id}?key=${apiKey}`;

  try {
    const response = await fetch(url); // Haal de details van het boek op
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

    // Render de detailpagina voor het boek
    return res.send(renderTemplate('server/views/detail.liquid', {
      title: book.title,
      book,
      favorites: getFavorites().map(f => f.id), // Voeg de opgeslagen favorieten toe
    }));
  } catch (error) {
    console.error('Error fetching book detail:', error);
    return res.status(500).send('Boek ophalen mislukt');
  }
});

// 9. Favorietenpagina
app.get('/favorites', (req, res) => {
  const favorites = getFavorites(); // Haal de favorieten op

  // Render de favorietenpagina
  return res.send(renderTemplate('server/views/favorites.liquid', {
    title: 'Favorieten',
    favorites,
  }));
});

// 10. Template-rendering functie
const renderTemplate = (template, data) => {
  const templateData = {
    NODE_ENV: process.env.NODE_ENV || 'production', // Voeg de omgeving toe aan de template data
    ...data
  };

  return engine.renderFileSync(template, templateData); // Render de template met de data
};

// 11. Favorieten opslaan (tijdelijk in geheugen)
app.post('/favorites/:id', async (req, res) => {
  const id = req.params.id; // Haal het ID van het boek op uit de URL
  try {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk); // Lees de inkomende request body in stukken
    }
    const body = Buffer.concat(chunks).toString(); // Combineer de body in één string
    const data = new URLSearchParams(body); // Parse de data uit de body

    const book = {
      id: id,
      title: data.get('title'),
      authors: data.get('authors')?.split(','),
      thumbnail: data.get('thumbnail'),
    };

    const favorites = getFavorites(); // Haal de huidige favorieten op
    // Voeg het boek toe als het nog niet in de favorieten staat
    if (!favorites.find(savedBook => savedBook.id === book.id)) {
      favorites.push(book);
      saveFavorites(favorites); // Sla de bijgewerkte favorieten op
    }

    return res.redirect('/book/' + id); // Redirect naar de boekdetailpagina
  } catch (error) {
    console.error('Favoriet toevoegen mislukt:', error);
    res.status(500).send('Fout bij opslaan favoriet');
  }
});

// 12. Favorieten verwijderen
app.post('/favorites/delete/:id', async (req, res) => {
  const idToDelete = req.params.id; // Haal het ID op van het boek dat verwijderd moet worden

  const favorites = getFavorites(); // Haal de huidige favorieten op
  const filtered = favorites.filter(favorite => favorite.id !== idToDelete); // Verwijder het boek met het opgegeven ID

  saveFavorites(filtered); // Sla de gefilterde lijst van favorieten op

  return res.redirect('/favorites'); // Redirect naar de favorietenpagina
});
