# Reschedule if we can not sync

1. Given that we can not sync

2. Notify that we are not syncing

3. Schedule sync

# Do nothing if we are already syncing

1. Given that we can sync

2. Given that we are already syncing

3. Return

## Group: can-sync-notify-syncing

1. Given that we can sync

2. Given that we are not already syncing

3. Notify that we are syncing

# Do nothing if nothing to sync

1. Group: can-sync-notify-syncing

2. Given that there is nothing to sync

3. Notify that we are not syncing

4. Return

# Do not sync online experience updates if sync data contains errors from previous sync

1. Group: can-sync-notify-syncing

2. Given that sync data is an online experience

3. Given that data to sync contains errors from previous sync

4. Return

# Sync online experience own fields updates

1. Group: can-sync-notify-syncing

# Sync online experience definition updates

1. Group: can-sync-notify-syncing

# Sync online experience new entries

1. Group: can-sync-notify-syncing

# Sync online experience updated entries

1. Group: can-sync-notify-syncing

# Sync online experience deleted entries

1. Group: can-sync-notify-syncing

# Sync offline experience

1. Group: can-sync-notify-syncing
