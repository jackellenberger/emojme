#!/bin/bash

# Don't lose all our progress if we can avoid it
mv USAGE.md USAGE.md.old

# Get top level commands into USAGE.md
echo "# Commands" > USAGE.md
echo "\`\`\`" >> USAGE.md
./emojme.js >> USAGE.md
echo "\`\`\`" >> USAGE.md

# Parse back out the commands so we can run them
# NOTE: thie head'ing depends on the above, be careful not to heck it up!
for command in $(cat USAGE.md | sed -n '/^Commands:$/,$p' | head -n-2 | tail -n+2 | awk '{print $1}'); do
  echo >> USAGE.md
  echo "## emojme $command" >> USAGE.md
  echo "\`\`\`" >> USAGE.md
  node emojme-${command}.js --help >> USAGE.md
  echo "\`\`\`" >> USAGE.md
done

