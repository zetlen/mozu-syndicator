# Mozu Syndicator
### version 0.1.0

An Arc.js-powered content syndication library to help you *seamlessly embed Mozu content* on other websites.

## Installing the library

Like other Arc.js actions built from shared code, you'll have to download this repository. You can download it as a ZIP or use Git to clone it yourself:

```sh
git clone http://github.com/zetlen/mozu-syndicator
```

Next, you should use the Mozu App Generator to configure your local repository to connect to your local Mozu developer account. First, create a Mozu App called "Syndicator" in your Developer Center. Copy its newly generated Application Key.

Next, if you haven't already installed the Mozu App Generator using NPM, do so now:

```sh
npm install -g yo generator-mozu-app
```

Then, use the app generator to create a new configuration file.

```sh
yo mozu-app --config
```

Enter the application key when prompted, and your credentials for the Mozu Developer Center.

Once those are configured, you can run the install script, which will build and upload your app.

```sh
grunt install
```

*Note that running `grunt` by itself here will run the whole build process, including linting and testing. Until you have created a `mozu.test.config.json` the tests will fail.*

Now that your library is uploaded, you should be able to go back to the Developer Center, find your "Syndicator" app, and click "Install" to choose your tenant to install it on.

The Syndicator library adds a behavior to your storefront; it will now serve the Syndicator library, and respond to batched requests for product data.

## Using the Code Snippet

Here's the easy part: Paste this code snippet anywhere on your non-Mozu website.

```js

(function() {

window.MozuSyndicatedStore = "http://t8819-s12869.sandbox.mozu-qa.com/";

(function(s, y, n, d, i, c, a, t, e) { 
  if (!s[d]) { s[d] = c; t = y.createElement(n), 
  e = y.getElementsByTagName(n)[0]; t.async = 1;
  t.src = a + i; e.parentNode.insertBefore(t,e);
} })(window,document,'script','MozuSyndicator', 
"?syndicator","_loading_",MozuSyndicatedStore);
}());

```

Replace the value of `window.MozuSyndicatedStore` with your own store domain. (Include a trailing slash.)

Now, you can embed Mozu products, and product search results anywhere on your page. Yes, you can use Hypr just like on Mozu. Yes, that's all.

## Working with Syndicated Mozu Content

Once the code snippet is on the page, you can embed Hypr templates anywhere, tag them with Mozu product searches or product codes, and they will come alive. Use a special `<script>` tag with the `type` attribute set to `"text/mozu-syndicated"`.

```html
<script type="text/mozu-syndicated" data-mozu-product-code="AftershockPKG1">
   <div class="mozu-product">
      <h3 class="mozu-productname">{{ model.content.productName }}</h2>
      <figure>
        <a href="http://t8819-s12869.sandbox.mozu-qa.com/{{ model.url }}">
          <img 
           style="width: 60%" 
           src="{{ model.content.productImages|first|prop('imageUrl') }}" />
        </a>
      </figure>
      <h4 class="mozu-price">{{ model.price.price|currency }}</h4>
      <p class="mozu-description">{{ model.content.productShortDescription }}</p>
      <p class="mozu-availability">
        <strong>Availability:</strong> 
        {{ model|get_product_attribute_value("tenant~availability") }}
      </p>
   </div> 
</script>
```

Because of the special attribute `data-mozu-product-code`, this Hypr template will evaluate in place, with the `model` set to live product data from Mozu!

And of course, this also works:

```html
<script type="text/mozu-syndicated" data-mozu-product-query="blue">
    <h4>Blue Stuff</h4>
    <ul>
    {% for item in model.items %}
      <li>
        <a href="http://t8819-s12869.sandbox.mozu-qa.com/{{ item.url }}">
          <img
           style="width: 60%" 
           src="{{ item.content.productImages|first|prop('imageUrl') }}" />
          {{ item.content.productName }}
        </a>
      </li>
    {% endfor %}
    </ul>
</script>
```


```html
<script type="text/mozu-syndicated" data-mozu-product-filter="categoryId req 1">
    <h4>Stuff In Category 1</h4>
    <ul>
    {% for item in model.items %}
      <li>
        <a href="http://t8819-s12869.sandbox.mozu-qa.com/{{ item.url }}">
          <img 
           style="width: 60%"
           src="{{ item.content.productImages|first|prop('imageUrl') }}" />
          {{ item.content.productName }}
        </a>
      </li>
    {% endfor %}
    </ul>
</script>
```

Embed as many snippets of Hypr as you want on the non-Mozu site; the syndicator will aggregate all the API calls it needs together into one, for efficiency and performance.


