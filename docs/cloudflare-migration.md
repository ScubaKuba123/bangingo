# BanginGo → Cloudflare Pages — plan bezpiecznej migracji

**Projekt:** BanginGo / Pearl Aurora (oficjalna wersja)
**Repozytorium:** ScubaKuba123/bangingo
**Gałąź przygotowania:** migration/bangingo-cloudflare-pages
**Status:** przygotowanie techniczne, **NIE** przełączono hostingu ani domeny.

## Co zachowujemy

- Strona Pearl Aurora i animowana rzeka/łódka (Canvas + lokalne zasoby);
- siedem pakietów, 10 języków, konfigurator i kontakt przez e-mail;
- krajowy wybór języka w /api/locale z priorytetem ręcznego wyboru;
- obecny Vercel jako plan awaryjny;
- dotychczasowe rekordy DNS i poczta bez zmian.

Migracja **nie zmienia** plików produkcyjnych, nie tworzy nowego HQ ani backendu rezerwacji.

## 1. Konfiguracja testowego Cloudflare Pages

1. Wejdź na https://dash.cloudflare.com/ → **Workers & Pages → Create → Pages → Connect to Git**.
2. Połącz GitHub i wybierz **ScubaKuba123/bangingo**.
3. Wybierz gałąź **migration/bangingo-cloudflare-pages** jako początkową **Production branch nowego projektu Cloudflare**. To nie zmienia Vercel ani gałęzi GitHub main.
4. Project name: **bangingo-staging** (o ile wolna).
5. Framework preset: **None**.
6. Root directory: pusty/default (root repozytorium).
7. Build command: `node scripts/build-cloudflare.mjs`
8. Build output directory: `dist`
9. Bez płatnych dodatków i bez zmiennych środowiskowych do obecnego zakresu.
10. Po pierwszym buildzie otwórz **rzeczywisty** URL `*.pages.dev` wygenerowany przez Cloudflare. Nie wymyślaj URL.

**Ważne:** nie dodawaj jeszcze `bangingo.com` w Cloudflare Pages i NIE zmieniaj nameserverów w Spaceship.

## 2. Zaliczenie testów na pages.dev

- Strona główna to **Pearl Aurora**, nie wybór wariantów;
- rzeka, łódka, ślad i scroll działają na desktopie i telefonie;
- zdjęcia, filmy (720/1080), fonty i linki do pakietów działają;
- wszystkie 7 podstron pakietowych można otworzyć;
- `/api/locale` działa i zwraca JSON oraz Cache-Control: private, no-store;
- dla PL/DE/JP wybór AUTO wskazuje poprawną wersję; ręczny wybór ma priorytet;
- przyciski kontaktu tworzą wiadomość do e-mail, nie udają wysłania;
- brak błędów sieciowych, awarii JS, poziomego scrolla;
- obsługa ograniczonych animacji działa;
- zebrano screeny desktop 1440 px i mobile 390 px;
- pliki są w limicie 25 MiB (skrypt budujący odmówi publikacji większych).

**Dopiero po rzeczywistym PASS przystępujemy do przełączenia domeny.**

## 3. Przeniesienie DNS domeny, bez przerwy w działaniu poczty

Rejestrator `bangingo.com`: **Spaceship**. Nie przenosimy rejestracji domeny; Cloudflare wymaga przełączenia **nameserverów** dla domeny głównej.

1. Dodaj `bangingo.com` jako DNS zone w **tym samym koncie Cloudflare**, gdzie jest Pages.
2. Zapisz / wyeksportuj całą obecną strefę DNS ze Spaceship: A, AAAA, CNAME, MX, TXT (SPF, DKIM, DMARC), CAA, SRV i rekordy usług dodatkowych. Zweryfikuj przede wszystkim adres `contact@bangingo.com`. Nie zakładaj, że MX istnieją, dopóki tego nie sprawdzisz.
3. Sprawdź ręcznie, czy skopiowane rekordy w Cloudflare odpowiadają rzeczywistym rekordom Spaceship. Stare rekordy www i @ kierujące do Vercel można zachować do momentu cutover.
4. Dodaj domenę główną i `www` przez **Pages → Custom domains**; domena musi być powiązana z właściwym projektem.
5. Dopiero teraz w Spaceship zmień nameservery na **dokładnie te**, które wyświetla Cloudflare dla tej strefy. Nie zgaduj nazw.
6. Poczekaj na potwierdzenie aktywacji strefy i certyfikatu. Przetestuj HTTPS dla apex i www, /api/locale, pakiety, animowaną rzekę i działanie poczty.
7. Ustaw przekierowanie www → apex w Cloudflare (Redirect Rules), a następnie zweryfikuj kod 301/308.
8. Pozostaw Vercel jako rollback przez okres odbioru. Jeśli coś się zepsuje, możliwy jest powrót do poprzednich NS po potwierdzeniu, że stare DNS nadal są poprawne.

## 4. Gałęzie, SEO i dalsza eksploatacja

- Nie scalaj tego PR do main przed akceptacją działającego preview.
- Po testach i przy zgodzie na publikację: merge PR, przestaw **Cloudflare Pages Production branch → main**, sprawdź nowy build i dopiero wykonaj cutover domeny.
- Produkcyjny Vercel miał `noindex`, dlatego staging Cloudflare zachowuje `X-Robots-Tag: noindex`, a istniejące HTML również zawierają `noindex`. SEO należy uruchomić **świadomie, osobną decyzją**, zdejmując oba ograniczenia i weryfikując robots.txt.
- Nie ustawiaj rekordu A `76.76.21.21` jako docelowego dla Cloudflare Pages: jest to adres obecnego Vercel, nie Cloudflare Pages.
- Koszty: Cloudflare Pages Free ma ograniczenia buildów, Functions i maksymalnego rozmiaru pliku. Nigdy nie zakładaj bezwarunkowo nieograniczonego użycia.

## Ważne linki

- Cloudflare dashboard: https://dash.cloudflare.com/
- Instrukcja Pages: https://developers.cloudflare.com/pages/get-started/git-integration/
- Domeny: https://developers.cloudflare.com/pages/configuration/custom-domains/
- Cloudflare Pages Functions: https://developers.cloudflare.com/pages/functions/get-started/

**STOP:** Brak dostępnego w tej rozmowie narzędzia do zapisu w koncie Cloudflare i Spaceship. Nie podawaj fikcyjnych URL preview ani nie deklaruj końcowej migracji bez testów.
