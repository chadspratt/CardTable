# CardTable
Web app for playing cards with someone else

You supply it with a csv file with 'name', 'image_url' and 'count' fields and it then allows you to draw from the resulting deck and play cards on a shared table with everyone else in the room.

It's functional but still fairly minimal and rough. The code is running at http://cards.dogtato.net/index.php though that is prone to break as it's used for development.

To install your own instance you would need to either create a mysql database or edit tableState.php to use a different database type. The current schema is bare-bones.

CurrentState:
* room (text)
* player (text)
* zone (text)
* type (text)
* id  (t)
* name (text)
* imageUrl (text)
* xPos (int)
* yPos (int)
* rotation (int)
* ordering (int)

LastRoomUpdate:
* id (autoincrement int)
* room (text)

You'll need a little more code to create the connection. I have an example for mysql in exampleconnection.inc
