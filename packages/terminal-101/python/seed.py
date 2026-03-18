# Set starting directory
shell.cd('/home/user')

# Pre-seed files
shell.echo('Welcome to the terminal!').out('/home/user/notes.txt')
shell.mkdir('/home/user/projects')
shell.mkdir('/home/user/projects/src')
shell.echo('My first project').out('/home/user/projects/README.md')
shell.echo("print('hello world')").out('/home/user/projects/src/hello.py')

# Server log for Lessons 4 and 5
log_lines = """2026-03-01 08:12:04 INFO  Server started on port 8080
2026-03-01 08:12:05 INFO  Database connection established
2026-03-01 08:15:22 INFO  User alice logged in
2026-03-01 08:17:41 WARN  Slow query detected (2.3s)
2026-03-01 08:22:10 INFO  Processing batch job #1042
2026-03-01 08:23:55 ERROR Connection refused to cache server
2026-03-01 08:24:01 WARN  Falling back to direct database queries
2026-03-01 08:30:12 INFO  User bob logged in
2026-03-01 08:31:44 INFO  Batch job #1042 completed
2026-03-01 08:45:03 WARN  Memory usage at 85%
2026-03-01 08:52:18 ERROR Disk write failed: /var/log/app.log
2026-03-01 09:01:30 INFO  Scheduled backup started
2026-03-01 09:05:44 INFO  Backup completed successfully
2026-03-01 09:12:07 ERROR Timeout waiting for API response (gateway)
2026-03-01 09:15:00 INFO  Health check passed""".strip()

shell.echo(log_lines).out('/home/user/projects/server.log')

# Reset cwd to home
shell.cd('/home/user')
