# first task
**Instead of telling the map or marker to jump directly to the target degree numbers sent by the browser, you tell the code: "Every frame (60 times a second), slowly drift towards the current target angle."**

# second task
**To point the map directly south, you need to set this value to 180 degrees.
Keep the Compass Visible: Ensure the UI compass widget is enabled. It will automatically point "down" toward the bottom of the screen to indicate where North is.**

# third task
** you need to implement Heading Tracking (often called "Course Up" or "Follow Bearings" mode)
This automatically rotates the map to match the direction the user's phone is physically facing.
When a user turns left, the map rotates right, ensuring that whatever is physically in front of the user is always at the top of their screen.**

# fourth task
** since it is a website think if we need request permission to access the mobile device's DeviceOrientation API (the compass) and feed that angle into your map framework.**
# fifth task
** implement line pattern textures or geodesic dash arrays that repeat along your route line geometry**