from __future__ import division
import numpy as N
from math import factorial
from scipy.special import gamma
from itertools import product
from .geom.util import dot
from .stereonet import sph2cart

def confluent_hypergeometric_function(k1, k2, n=10):
    val = 0
    for i,j in product(range(n), range(n)):
        top = gamma(i+0.5)*gamma(j+0.5)*k1**i*k2**j
        btm = gamma(i+j+3/2)*factorial(i)*factorial(j)
        val += top/btm
    return val

def bingham_pdf(fit):
    """
    From the *Encyclopedia of Paleomagnetism*
    """
    kappa = (fit.eigenvalues-fit.eigenvalues[2])[:-1]
    kappa /= kappa[-1]
    F = N.sqrt(N.pi)*confluent_hypergeometric_function(*kappa)
    e1, e2 = fit.axes[:-1]

    def pdf(I, D):
        # Given in spherical coordinates of inclination
        # and declination in radians

        xhat = sph2cart(D,I).T

        return 1/F*N.exp(
              kappa[0]*dot(xhat,e1)**2
            + kappa[1]*dot(xhat,e2)**2)*N.cos(I)

    return pdf

def regular_grid(**kwargs):
    n = kwargs.pop('n', 100)
    gridsize = kwargs.pop('gridsize',None)
    if gridsize is None:
        gridsize = (n,n)

    bound = N.pi/2
    nrows, ncols = gridsize
    xmin, xmax, ymin, ymax = -bound, bound, -bound, bound
    lon, lat = N.mgrid[xmin : xmax : ncols * 1j, ymin : ymax : nrows * 1j]
    return lon,lat


