# There is no retry prompt when experience successfully fetched from server

1. Given there is connection
2. Given there is experience in the system
3. When page is rendered
4. Loading indicator should be visible
5. Experience should not be visible
6. Retry UI should not be visible
7. Experience should be visible - after a while
8. Loading indicator should not be visible
9. Retry UI should not be visible

# Given fetching experience from server fails, when retry from cache succeeds, experience should be visible

1. Given there is connection
2. Given there is no experience in the server
3. When page renders
4. Loading indicator should be visible
5. Experience should not be visible
6. Retry UI should not be visible
7. Retry UI should be visible - after a while
8. Loading indicator should not be visible
9. Experience should not be visible
10. Given there is experience in the cache
11. When retry UI is clicked
12. Experience should not be visible
13. Experience should be visible - after a while
14. Retry UI should not be visible

# Close success notification automatically and manually when experience updated

1. Given there is experience in the cache
2. When page is rendered
3. Update UI request button should be visible
4. Update UI should not be visible
5. When update UI is requested
6. Update UI should be visible
7. When Update UI is closed
8. Update UI should not be visible
9. When Update UI is requested
10. Update UI should be visible
11. Success notification should not be visible
12. When update succeeds
13. Update UI should not be visible
14. Success notification should be visible
15. When success notification is manually closed
16. Success notification should not be visible
17. When Update UI is requested
18. Update should be visible - when update succeeds
19. Success notification should be visible
20. Success notification should not be visible - after a while

# Delete experience succeeds

1. Given there is experience in the cache
2. Given the experience can be deleted successfully
3. When page renders
4. Trigger delete UI should be visible
5. Confirm delete UI (header) should not be visible
6. When delete UI is requested
7. Confirm delete UI (header) should be visible
8. When user opts not to delete
9. Confirm delete UI (header) should not be visible
10. Confirm delete UI (footer) should not be visible
11. When delete is requested
12. Confirm delete UI (footer) should be visible
13. When user opts not to delete
14. Confirm delete UI (footer) should not be visible
15. When delete UI is requested
16. When user confirms delete
17. User should not be navigated away from page
18. User should be navigated away from page - after a while
19. Resources from previous page should be cleaned up

# Delete experience failure notification can be closed manually

1. Given there is experience in the cache
2. Given the experience can not be deleted successfully
3. When page renders
4. Trigger delete UI should be visible
5. Failure notification should not be visible
6. When delete UI is requested
7. When delete confirmed by user
8. Failure notification should be visible
9. When failure notification closed
10. Failure notification should not be visible

# Delete experience failure notification can be closed automatically

1. Given there is experience in the cache
2. Given the experience can not be deleted successfully
3. When page renders
4. Trigger delete UI should be visible
5. Failure notification should not be visible
6. When delete UI is requested
7. When delete confirmed by user
8. Failure notification should be visible
9. Failure notification should be closed automatically

# Update cache and redirect user for successfully synced page and non page offline experiences. Show error notification for failed sync offline/part offline entries

1. Given we are viewing detail page of an offline experience (pageOfflineExperience)

2. Given there is offline entry in frontend cache

3. Given there is updated online entry in frontend cache

4. Given pageOfflineExperience will be successfully synced to server

5. Given there is another offline experience (that we are not currently viewing
   i.e nonPageOfflineExperience) in frontend cache and will be synced successfully

6. Given the offline entry will not be successfully synced to server

7. Given that updated online entry will not be successfully synced to server

8. Given that we can successfully stop tracking pageOfflineExperience after
   syncing

9. When page renders

10. Sync error notification should not be visible

11. Sync error notification should be visible - after a while

12. Ledger entry mapping online experience to pageOffline experience should
    have been kept

13. User should be redirected away from pageOfflineExperience to corresponding
    online experience detail page

14. Clean up codes should be called

15. nonPageOfflineExperience should have been cleaned up from frontend cache
    (since it was successfully synced)

# Show error notification for failed syncing of updated experience. Prevent new entry creation until entry sync error fixed

1. Given we are viewing detail page of an online experience

2. Given experience has online entry

3. Given some offline updates to the experience will be synced successfully

4. Given offline entry created for the experience will be synced successfully

5. Given that offline update of the title field of the experience will not be synced successfully

6. Given that offline update to field definitions of experience will not be
   synced successfully

7. Given that offline update to online entry of experience will not be synced successfully

8. Given that experience will be successfully remove from ledger after sync

9. When page renders

10. Sync error notification should not be visible

11. Sync error notification should be visible - after a while

12. Synced offline entry should have been cleaned up from frontend cache

13. User should be redirected away from pageOfflineExperience to corresponding
    online experience detail page

14. Button prompting to fix sync errors of failed updated entry should not be visible

15. When button (from the menu) to create new entry is clicked

16. Button prompting to fix sync errors of failed updated entry should be
    visible (we can not create new entry since we have an entry that failed to
    sync)

17. When entry errors are fixed

18. Button prompting to fix sync errors of failed updated entry should not be visible

# Comments menu

1. Given we are on detailed page of experience

2. When app renders

3. Button to show comments menu should be visible

4. Button to create new comment should not be visible

5. Button to hide comments menu should not be visible

6. When show comments menu button is clicked

7. Button to create new comment should be visible

8. Button to show comments menu should not be visible

9. Button to hide comments menu should be visible

10. When button to hide comments menu is clicked

11. Button to create new comment should not be visible

12. Button to hide comments menu should not be visible

13. Button to show comments menu should be visible
