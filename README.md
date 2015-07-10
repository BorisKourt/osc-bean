## Install

If you are on a Mac, please install Node through [homebrew](http://brew.sh/). 

```
brew install node
```

Once installed, in the directory that you have the `connect.js` file, run:

```
npm install noble lodash osc-min --save
```

Now that you have the dependencies, you can run the connection by:

```
node connect.js
```

You should see some output in your terminal that ends with sending characteristics. 

## Options

To connect only to a limited set of Devices type:

```
node connect.js "device1name" "device2name"
```

## Output

The script will connect to any Bean it can find, and read data from each of the characteristics. It will then write OSC packets to
port 41234. Just listen to this port to see data. 