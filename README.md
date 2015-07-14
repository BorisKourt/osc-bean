## Install Node & Dependencies 

If you are on a Mac, please install Node through [homebrew](http://brew.sh/). 

```
brew install node
```

Once installed, navigate to the root of this repository in terminal. 
Once there you need to setup the dependencies. Run:

```
npm install
```

This will setup [noble](https://github.com/sandeepmistry/noble) and a few helper libraries. Noble handled all bluetooth
low energy connectivity, and the majority of this code interfaces with its functions.

## Running

```
node connect.js
```

Will connect to any Beans in the area. 

```
node connect.js "device1name" "device2name"
```

Will connect to device names that you specify explicitly, don't forget the quotes.

## Exiting

To exit press `control + c` this will disconnect from the Beans cleanly.

## Output

The script will connect to any Bean it can find, and read data from each of the characteristics. It will then write OSC packets to
the port listed in `port-record/mpr.edn` under the `:processing-bean` key. Just listen to this port to see data. 