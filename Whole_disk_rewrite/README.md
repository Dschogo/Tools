# Rewrites specific folders to disk

Procedure:

1. renames one file at a time
2. copies the file (with the original name)
3. compares the sizes (if they dont match it aborts)
4. deletes the renamed source file
5. writes it to a log (for restart purposes)
