## Downloading

If you are familiar with git I would suggest that you clone this repository as you would normally.
 
If you would rather not work with git, you can press the download button on the right. Or [click this link](https://github.com/BorisKourt/osc-bean/archive/master.zip).
Just extract the zip file and navigate to it in terminal.

## Install Node & Dependencies 

If you are on a Mac, please install Node through [homebrew](http://brew.sh/). 

```
brew install node
```

Once installed, navigate to the root of this repository in terminal. 
There you need to setup the libraries that this depends on, just run:

```
npm install
```

(Note that an internet connection is required for both of these steps.)

This will setup [noble](https://github.com/sandeepmistry/noble) and a few helper libraries. Noble handles all Bluetooth
Low Energy connectivity, and the majority of this code interfaces with its functions.

## Running

Connect to any Beans in the area. 

```
node connect.js
```

Connect to device names that you specify explicitly, don't forget the quotes.

```
node connect.js "device1name" "device2name"
```

## Exiting

To exit, in terminal, press `control + c` this will disconnect from the Beans cleanly.

## Output

The script will connect to any Bean it can find, and read data from each of the characteristics. It will then write OSC packets to
the port listed in `port-record/mpr.edn` under the `:processing-bean` key. Just listen to this port to see data. 