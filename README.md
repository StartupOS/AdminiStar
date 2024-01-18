# AdminiStar
An admin panel for TypeORM entities.

This is pretty heavily inspired by Django Admin, and is designed to be extremely extensible.

If you're using TypeORM, all you have to do is

```
    import { AdminiStar } from 'administar'
    administar = new AdminiStar({
        dataSource: myDataSource,
        entities: [myEntity1, myEntity2, ...],
    })
    administar.init()
```

# Open Source Acknowledgements
We use Font Awesome, and we love it.
Font Awesome Free 6.4.2 by @fontawesome - https://fontawesome.com

License - https://fontawesome.com/license/free (Icons: CC BY 4.0, Fonts: SIL OFL 1.1, Code: MIT License)

Copyright 2023 Fonticons, Inc.

We're also built on Express, TypeScript, Pug, and TypeORM