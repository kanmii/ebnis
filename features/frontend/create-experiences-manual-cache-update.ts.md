# Definition of terms

## result

The result sent by server when an experience created

# Fresh experience created online

1. Given one existing experience in cache

2. Given created experience returned from server

3. Given experience can not be found in root of cache

4. Given experience can not be found in `ROOT_QUERY.getExperiences`

5. After processing

6. Experience should be found in root of cache

7. Experience should be first element of `ROOT_QUERY.getExperiences`

# Offline experience synced - no errors, no entries

1. Given one online experience in cache

2. Given one offline experience in cache

3. Offline experience should be in ledger

4. Given offline experience successfully synced to server

5. Given online counterpart of offline experience can not be found in root of
   cache

6. Given online counterpart of offline experience can not be found in `ROOT_QUERY.getExperiences`

7. After processing

8. Online counterpart of offline experience should be found in root of cache

9. Online counterpart of offline experience should be first element of `ROOT_QUERY.getExperiences`

10. Synced offline experience should not be found in root of cache

11. Synced offline experience should not be found `ROOT_QUERY.getExperiences`

12. Offline experience should be removed from ledger

# Offline experience with entries synced - no errors

# Offline experience with entries synced - with errors
