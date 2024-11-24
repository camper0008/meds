# meds

dumb (as in 'simple', 'not smart') pill inventory tracker 

## functionality

a pill is tracked by a json file in `pills/` resembling `pills/example.json`, i.e. you could have a file, `pills/vitamin_d` with the contents

```json
{
  "perDay": 2,
  "count": 37
}
```

your vitamin d supply will then be tracked, and 2 pills will be removed every time an update occurs.

restocking is done by creating a file in `restock/<pill_name>`, in our case `pills/vitamin_d`, resembling `restock/example.json` :

```json
{
    "count": 50
}
```

50 pills will then be added to your `vitamin_d` count next time an update occurs, and `restock/vitamin_d` will be removed.

the result of a `status`, or `update` call, can be rendered with `render`, and will produce a table formatted as so:

```
+-----------+-------+--------+----------+
| name      | count | perDay | daysLeft |
+-----------+-------+--------+----------+
| vitamin_d |    37 |      2 |       18 |
+-----------+-------+--------+----------+
```
