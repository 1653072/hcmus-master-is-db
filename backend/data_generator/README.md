# Data Generator

This tool helps initialize sample data for the Bookstore system.

## How to Use

1. Configure the `.env` file in the root directory `/backend`.
2. **CRITICAL: Start all database containers first.** Ensure PostgreSQL, MongoDB, and Neo4j are up and running:
   ```bash
   make db-start
   ```
3. Run the following command:

    ```bash
    go run main.go
    ```

## Notes
- This script will append data to the current database. If you want to clear all old data before running, use the `make db-stop` command and remove docker volumes as instructed in the main README.
- Execution time may take several minutes depending on machine configuration due to the large number of records (100,000+).
