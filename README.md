# Scrapper

The Streamlit dashboard UI acts as the Human-in-the-Loop fallback and triage mechanism for your scraper pipeline.

Since websites regularly change their designs, even a highly resilient scraping architecture will eventually encounter broken selectors, layout shifts, or CAPTCHA blocks. Instead of allowing these failures to crash the scraper or silently corrupt your database, the Streamlit dashboard serves as a bridge between automated errors and clean data storage through a structured recovery cycle:

Scraper Error Isolation: When the scraper encounters a layout exception, it catches the error safely without stopping the rest of the batch queue. It writes the failing URL and the error trace details directly to a human_triage_queue table in your database.

Dashboard Visibility: The Streamlit app connects to this database to monitor the triage table, displaying a clean list of failed runs to developers or operations team members.

The Manual Override: Through the Streamlit UI, a human operator can review the broken link, manually edit/type in the missing data fields, or override page elements.

Data Promotion: Once processed and approved through the UI, the app marks the record clean and migrates it back to your clean production database tables, resolving the exception gracefully.

By decoupling your raw data ingestion from manual fixes, you prevent silent data loss and avoid having to build overly complex "AI self-healing" models when a simple manual override is faster and 100% accurate.

🛠️ Would you like to see the Python code to build this Streamlit triage dashboard and connect it to your database's queue table?

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/d1cd72ac-da03-4ec2-b353-7361702efa93).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
